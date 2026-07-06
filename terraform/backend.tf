# Terraform Backend Configuration for OCI Object Storage
# This file enables remote state management using Oracle Cloud Object Storage
# 
# Prerequisites:
# 1. Create an OCI Object Storage bucket named "terraform-state" in your OCI tenancy
# 2. Ensure your OCI CLI credentials are configured (~/.oci/config)
# 3. Run: terraform init -reconfigure

terraform {
  backend "s3" {
    bucket                      = "terraform-state"
    key                         = "oke-app/terraform.tfstate"
    region                      = "uk-london-1"
    endpoint                    = "https://lryo68b31h2j.compat.objectstorage.uk-london-1.oraclecloud.com"
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    encrypt                     = true
  }
}

# To migrate from local state to remote state:
# 1. Initialize: terraform init -reconfigure
# 2. Verify state migrated: terraform state list
# 3. Remove local state: rm terraform.tfstate terraform.tfstate.backup
# 4. Update .gitignore to exclude terraform.tfstate*
