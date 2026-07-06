variable "compartment_id" {
  type        = string
  description = "The OCID of the compartment where the Container Registry repository will be created"
  default     = "ocid1.tenancy.oc1..aaaaaaaa7a3yc7m4j6bjuygbt5dhqqqfpgpq5euedvaeuswjhng3skyrnlhq"
}

variable "region" {
  type        = string
  description = "The OCI region to deploy resources into"
  default     = "uk-london-1"
}

variable "repository_name" {
  type        = string
  description = "The name of the OCI Container Registry repository"
  default     = "oke-app"
}

variable "is_public" {
  type        = bool
  description = "Whether the repository should be public. Private is recommended for DevSecOps."
  default     = false
}
