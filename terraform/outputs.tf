output "repository_id" {
  description = "The OCID of the container repository"
  value       = oci_artifacts_container_repository.app_repo.id
}

output "repository_path" {
  description = "The registry path for the repository"
  value       = "${var.region}.ocir.io/lryo68b31h2j/${var.repository_name}"
}

output "registry_endpoint" {
  description = "The login endpoint for OCI Container Registry"
  value       = "${var.region}.ocir.io"
}
