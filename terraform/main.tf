terraform {
  required_version = ">= 1.2.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 4.0.0"
    }
  }
}

provider "oci" {
  region = var.region
  # The OCI provider automatically reads authentication from ~/.oci/config by default.
}

resource "oci_artifacts_container_repository" "app_repo" {
  compartment_id = var.compartment_id
  display_name   = var.repository_name
  is_public      = var.is_public
  is_immutable   = false

  # Auto-cleanup policies or tagging can be added here if needed
  defined_tags  = {}
  freeform_tags = {
    "Project"     = "OKE-App"
    "Environment" = "Production"
  }
}
