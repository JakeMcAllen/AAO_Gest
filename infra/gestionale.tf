# ============================================================
# Gestionale venditori — tabelle, bucket, Lambda e rotte aggiuntive.
#
# Da copiare in ../../Terraform/ : il file è additivo e riusa le risorse già
# definite lì (local.prefix, aws_iam_role.lambda, aws_apigatewayv2_api.http),
# senza toccarle.
#
#   cp Gestionale/infra/gestionale.tf Terraform/
#   cd Terraform && terraform init && terraform apply
# ============================================================

locals {
  gestionale_prefix = local.prefix

  # Una Lambda per risorsa, codice in ../Gestionale/lambda/<name>/main.js
  gestionale_functions = toset(["catalog", "media", "listings", "permissions", "reports"])

  gestionale_routes = {
    "ANY /catalog"            = "catalog"
    "ANY /catalog/{proxy+}"   = "catalog"
    "ANY /media"              = "media"
    "ANY /media/{proxy+}"     = "media"
    "ANY /listings"           = "listings"
    "ANY /listings/{proxy+}"  = "listings"
    "ANY /permissions"        = "permissions"
    "ANY /permissions/{proxy+}" = "permissions"
    "ANY /reports"            = "reports"
    "ANY /reports/{proxy+}"   = "reports"
  }
}

# ------------------------------------------------------------
# DynamoDB
# ------------------------------------------------------------

# Catalogo globale: un prodotto esiste una volta sola sulla piattaforma.
# L'unicità è garantita da un item guardia "KEY#<catalogKey>" scritto nella
# stessa transazione della scheda (vedi lambda/catalog/main.js).
resource "aws_dynamodb_table" "catalog_products" {
  name         = "${local.gestionale_prefix}-catalog-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "catalogKey"
    type = "S"
  }
  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "catalogKey-index"
    hash_key        = "catalogKey"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  tags = { Project = var.project, Environment = var.environment }
}

# Fotografie: ognuna di proprietà del negozio che l'ha caricata.
# `generic = true` significa condivisa con tutto il catalogo.
# Chiave sull'id perché aggiornamento e cancellazione avvengono per immagine;
# l'elenco per prodotto passa dal GSI.
resource "aws_dynamodb_table" "product_images" {
  name         = "${local.gestionale_prefix}-product-images"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "imageId"

  attribute {
    name = "imageId"
    type = "S"
  }
  attribute {
    name = "productId"
    type = "S"
  }
  attribute {
    name = "ownerStoreId"
    type = "S"
  }

  global_secondary_index {
    name            = "imageProductId-index"
    hash_key        = "productId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "ownerStoreId-index"
    hash_key        = "ownerStoreId"
    projection_type = "ALL"
  }

  tags = { Project = var.project, Environment = var.environment }
}

# Proposte di vendita: una riga per coppia negozio/prodotto. Il GSI serve alla
# pagina pubblica del prodotto, che elenca tutti i venditori.
resource "aws_dynamodb_table" "listings" {
  name         = "${local.gestionale_prefix}-listings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "storeId"
  range_key    = "productId"

  attribute {
    name = "storeId"
    type = "S"
  }
  attribute {
    name = "productId"
    type = "S"
  }

  global_secondary_index {
    name            = "productId-index"
    hash_key        = "productId"
    projection_type = "ALL"
  }

  tags = { Project = var.project, Environment = var.environment }
}

# Concessioni d'uso dei contenuti fra negozi.
resource "aws_dynamodb_table" "content_permissions" {
  name         = "${local.gestionale_prefix}-content-permissions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "ownerStoreId"
    type = "S"
  }
  attribute {
    name = "requesterStoreId"
    type = "S"
  }

  global_secondary_index {
    name            = "ownerStoreId-index"
    hash_key        = "ownerStoreId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "requesterStoreId-index"
    hash_key        = "requesterStoreId"
    projection_type = "ALL"
  }

  tags = { Project = var.project, Environment = var.environment }
}

# Segnalazioni: tabella separata, consultabile per negozio segnalato,
# per segnalante e per stato di lavorazione.
resource "aws_dynamodb_table" "content_reports" {
  name         = "${local.gestionale_prefix}-content-reports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "targetOwnerStoreId"
    type = "S"
  }
  attribute {
    name = "reporterStoreId"
    type = "S"
  }
  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "targetOwnerStoreId-index"
    hash_key        = "targetOwnerStoreId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "reporterStoreId-index"
    hash_key        = "reporterStoreId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "reportStatus-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  tags = { Project = var.project, Environment = var.environment }
}

# ------------------------------------------------------------
# S3 — fotografie dei prodotti
# Chiavi:  products/<productId>/<imageId>/full.webp
#          products/<productId>/<imageId>/cover.webp
# ------------------------------------------------------------

resource "aws_s3_bucket" "media" {
  bucket = "${local.gestionale_prefix}-media-${data.aws_caller_identity.current.account_id}"
  tags   = { Project = var.project, Environment = var.environment }
}

# Nessun accesso pubblico diretto: si passa da URL prefirmate.
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Il browser carica le derivate direttamente sul bucket con una PUT prefirmata.
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Le foto eliminate dai negozi restano recuperabili per 30 giorni.
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-deleted"
    status = "Enabled"

    filter {
      prefix = "deleted/"
    }

    expiration {
      days = 30
    }
  }
}

# ------------------------------------------------------------
# IAM — estensione del ruolo Lambda già esistente
# ------------------------------------------------------------

data "aws_iam_policy_document" "gestionale_dynamo" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:TransactWriteItems",
    ]
    resources = [
      aws_dynamodb_table.catalog_products.arn,
      "${aws_dynamodb_table.catalog_products.arn}/index/*",
      aws_dynamodb_table.product_images.arn,
      "${aws_dynamodb_table.product_images.arn}/index/*",
      aws_dynamodb_table.listings.arn,
      "${aws_dynamodb_table.listings.arn}/index/*",
      aws_dynamodb_table.content_permissions.arn,
      "${aws_dynamodb_table.content_permissions.arn}/index/*",
      aws_dynamodb_table.content_reports.arn,
      "${aws_dynamodb_table.content_reports.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "gestionale_dynamo" {
  name   = "${local.gestionale_prefix}-gestionale-dynamo"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.gestionale_dynamo.json
}

data "aws_iam_policy_document" "gestionale_s3" {
  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.media.arn]
  }
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }
}

resource "aws_iam_role_policy" "gestionale_s3" {
  name   = "${local.gestionale_prefix}-gestionale-s3"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.gestionale_s3.json
}

# ------------------------------------------------------------
# Lambda + rotte
# ------------------------------------------------------------

data "archive_file" "gestionale_fn" {
  for_each    = local.gestionale_functions
  type        = "zip"
  source_dir  = "${path.module}/../Gestionale/lambda/${each.key}"
  output_path = "${path.module}/build/gestionale-${each.key}.zip"
}

resource "aws_lambda_function" "gestionale" {
  for_each = local.gestionale_functions

  function_name    = "${local.gestionale_prefix}-${each.key}"
  role             = aws_iam_role.lambda.arn
  runtime          = var.lambda_runtime
  handler          = "main.handler"
  filename         = data.archive_file.gestionale_fn[each.key].output_path
  source_code_hash = data.archive_file.gestionale_fn[each.key].output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = merge(local.lambda_env, {
      TABLE_CATALOG     = aws_dynamodb_table.catalog_products.name
      TABLE_IMAGES      = aws_dynamodb_table.product_images.name
      TABLE_LISTINGS    = aws_dynamodb_table.listings.name
      TABLE_PERMISSIONS = aws_dynamodb_table.content_permissions.name
      TABLE_REPORTS     = aws_dynamodb_table.content_reports.name
      BUCKET_MEDIA      = aws_s3_bucket.media.bucket
      MEDIA_URL_TTL     = "3600"
    })
  }

  tags = { Project = var.project, Environment = var.environment }
}

resource "aws_lambda_permission" "gestionale_apigw" {
  for_each = local.gestionale_functions

  statement_id  = "AllowAPIGatewayInvokeGestionale"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.gestionale[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "gestionale" {
  for_each = local.gestionale_functions

  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.gestionale[each.key].invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "gestionale" {
  for_each = local.gestionale_routes

  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.gestionale[each.value].id}"
}

output "gestionale_media_bucket" {
  description = "Bucket S3 delle fotografie di prodotto."
  value       = aws_s3_bucket.media.bucket
}

output "gestionale_tables" {
  description = "Tabelle DynamoDB introdotte dal gestionale."
  value = {
    catalog     = aws_dynamodb_table.catalog_products.name
    images      = aws_dynamodb_table.product_images.name
    listings    = aws_dynamodb_table.listings.name
    permissions = aws_dynamodb_table.content_permissions.name
    reports     = aws_dynamodb_table.content_reports.name
  }
}
