# OKE-App: Comprehensive Tools & Architecture Explanation

## 🎯 Project Overview
OKE-App is a cloud-native web application deployed on **Oracle Container Engine for Kubernetes (OKE)**. It follows modern **DevSecOps** and **GitOps** practices with automated CI/CD pipelines, container security scanning, and declarative infrastructure management.

---

## 🛠️ Tools & Technologies Breakdown

### 1. **Oracle Container Engine for Kubernetes (OKE)** 
**What it does:**
- Managed Kubernetes service on Oracle Cloud Infrastructure (OCI)
- Orchestrates containerized applications with automatic scaling, load balancing, and high availability
- Provides native integration with OCI services (Container Registry, Load Balancer, Networking)

**In this project:**
- Hosts 2 replicas of the Node.js application (defined in Helm chart)
- Exposes application via OCI Network Load Balancer
- Runs ArgoCD as the GitOps controller to manage deployments
- Provides Kubernetes API for pod metadata retrieval (Downward API)

---

### 2. **Terraform**
**What it does:**
- Infrastructure-as-Code (IaC) tool for provisioning and managing cloud resources declaratively
- Stores state of provisioned resources to track changes and manage lifecycle
- Enables reproducible, version-controlled infrastructure

**In this project:**
- **Creates:** OCI Container Registry (OCIR) repository for storing Docker images
- **Files:**
  - `main.tf` - Defines OCI provider and registry resource
  - `variables.tf` - Input variables (compartment, region, repository name)
  - `outputs.tf` - Outputs registry endpoint, path, and ID
  - `terraform.tfstate` - **LOCAL state file** (currently stored in repo - security risk!)
  
**Current Issue:** State file is stored locally in version control, which is a security and collaboration risk.

---

### 3. **Docker & Dockerfile**
**What it does:**
- Containerizes the Node.js application into a portable, reproducible environment
- Ensures consistency across dev, test, and production environments

**In this project (app/Dockerfile):**
- Multi-stage build: Uses `node:24-alpine` base image (lightweight)
- Installs only production dependencies (`--omit=dev`)
- Removes npm/npx to reduce attack surface
- Switches to non-root `node` user for security
- Runs on port 5000
- **Security focus:** Minimal image, no privilege escalation, no build tools in production

---

### 4. **Helm**
**What it does:**
- Package manager for Kubernetes applications
- Templates Kubernetes manifests to avoid repetition and enable reusability
- Manages deployments with variables, versioning, and easy upgrades

**In this project (helm/oke-app/):**
- **Chart.yaml** - Chart metadata (name, version, app version)
- **values.yaml** - Configuration defaults (replicas, image tag, resources, security settings)
- **templates/deployment.yaml** - Kubernetes Deployment with:
  - 2 replicas of the app
  - Security context (non-root user, dropped capabilities)
  - Liveness/Readiness probes checking `/api/info` endpoint
  - Environment variables injected via Downward API (POD_NAME, NODE_NAME, etc.)
  - Resource limits (200m CPU, 256Mi memory)
- **templates/service.yaml** - LoadBalancer service exposing port 80 → 5000
- **templates/ingress.yaml** - Optional ingress routing
- **templates/hpa.yaml** - Horizontal Pod Autoscaler (disabled by default)

**Key values configured:**
- Image repository: `uk-london-1.ocir.io/lryo68b31h2j/oke-app`
- Image tag: Latest commit SHA (auto-updated by CI/CD)
- Pull secret: `ocir-secret` (credentials to pull from private registry)
- Security: Non-root, immutable root filesystem disabled, read-only containers (where applicable)

---

### 5. **GitHub Actions (CI/CD Pipeline)**
**What it does:**
- Automates testing, building, scanning, and deploying code on every push/PR
- Enforces DevSecOps practices (linting, vulnerability scanning)
- Keeps deployment state in sync with Git

**In this project (.github/workflows/ci-cd.yml):**

**Workflow triggers:**
- On PRs to `main` (skips terraform/, README.md changes)
- On pushes to `main` (skips helm values.yaml, README.md, terraform/ to prevent loops)

**Job 1: Lint & Test (runs on PRs + pushes)**
1. **Checkout** - Clones repository
2. **Setup Node.js 24** - Installs Node.js runtime
3. **npm install** - Installs dependencies
4. **JavaScript Syntax Check** - `node --check app/app.js` validates syntax
5. **Helm Lint** - Validates Helm chart syntax
6. **Trivy Scan** - Security scans app dependencies before build

**Job 2: Build & Push (runs only on main branch pushes)**
1. **Login to OCI Registry** - Authenticates with OCI using secrets
2. **Build Docker Image** - Creates container image
3. **Trivy Scan Image** - Scans built image for vulnerabilities (fails if critical/high found)
4. **Push to OCIR** - Pushes image tagged with commit SHA
5. **Commit Image Tag** - **GitOps update**: Updates `helm/oke-app/values.yaml` with new image tag
6. **Git Push** - Pushes commit back to GitHub

**Secrets required:**
- `OCI_REGISTRY_USER` - OCI login username
- `OCI_AUTH_TOKEN` - OCI authentication token

---

### 6. **ArgoCD (GitOps Controller)**
**What it does:**
- Continuously monitors Git repository and syncs desired state to Kubernetes cluster
- Separates build (CI) from deployment (CD) responsibilities
- Enables declarative, auditable, and rollback-capable deployments

**In this project (gitops/argocd-app.yaml):**

**Application Manifest defines:**
- **Source:** GitHub repository URL + `helm/oke-app` directory
- **Destination:** `https://kubernetes.default.svc` (current OKE cluster)
- **Values file:** `values.yaml` (Helm values)

**Sync Policy:**
- **Automated sync:** Automatically applies changes from Git to cluster
- **Auto prune:** Removes resources deleted from Git
- **Self-heal:** Re-syncs if cluster state drifts from Git

**Workflow:**
1. Developer commits code to GitHub
2. GitHub Actions builds image, tests, scans, and pushes to OCIR
3. GitHub Actions updates `values.yaml` with new image tag and commits to Git
4. ArgoCD detects the change in Git
5. ArgoCD deploys Helm chart to OKE cluster
6. Kubernetes pulls image from OCIR and schedules pods

**Key benefit:** Cluster state is always defined in Git (single source of truth)

---

### 7. **Trivy (Security Scanner)**
**What it does:**
- Scans container images and source code for known vulnerabilities (CVEs)
- Part of Aqua's vulnerability database
- Fails CI/CD if critical/high vulnerabilities found

**In this project:**
- **Scanning targets:**
  1. Application dependencies (before Docker build)
  2. Built Docker image (after build, before push)
- **Configured to fail on:** Critical and High severity vulnerabilities
- **Ignores:** Specified vulnerabilities in `.trivyignore` file

---

### 8. **Pre-commit Hooks**
**What it does:**
- Enforces code quality and security checks before commits reach repository
- Prevents bad code from being committed

**Configured hooks:**
- **Trailing whitespace** - Removes trailing spaces
- **End-of-file-fixer** - Ensures files end with newline
- **check-yaml** - Validates YAML syntax (allows Helm templates)
- **check-merge-conflict** - Detects merge conflict markers
- **detect-private-key** - Prevents committing secrets
- **check-added-large-files** - Prevents files >500KB
- **hadolint** - Lints Dockerfile (ignores DL3018, DL3008)
- **helm-lint** - Validates Helm chart syntax

---

### 9. **Node.js & Express.js (Application Framework)**
**What it does:**
- Lightweight, performant JavaScript runtime and web framework
- Serves both backend API and frontend static assets

**In this project (app/app.js):**
- **Port:** 5000 (configurable via PORT env var)
- **API Endpoint:** `GET /api/info` - Returns pod/cluster metadata:
  - Pod name, namespace, IP
  - Node name
  - Container version info
  - Health status
- **Frontend:** Serves static files from `public/` directory (glassmorphic UI)
- **Kubernetes Integration:** Retrieves pod metadata via Downward API (environment variables)

---

### 10. **OCI Container Registry (OCIR)**
**What it does:**
- Private Docker registry for storing and distributing container images
- Integrated with OCI ecosystem (IAM, audit logs, etc.)
- Alternative to Docker Hub or ECR

**In this project:**
- **Registry endpoint:** `uk-london-1.ocir.io`
- **Repository path:** `uk-london-1.ocir.io/lryo68b31h2j/oke-app`
- **Access:** Private (requires authentication)
- **Created via:** Terraform resource `oci_artifacts_container_repository`

**Image tagging strategy:**
- Images tagged with commit SHA (e.g., `sha-4a71e8415247d9b3d90fc8bf9a5142801b3a8d9b`)
- Enables traceability and reproducible deployments

---

### 11. **OCI Load Balancer**
**What it does:**
- Distributes incoming traffic across multiple pod replicas
- Provides external IP address for public internet access
- Handles SSL/TLS termination (optional)

**In this project:**
- **Type:** Network Load Balancer (via Helm service type: LoadBalancer)
- **Ingress port:** 80 (HTTP)
- **Target port:** 5000 (application port)
- **Replicas:** 2 pods (load balanced across them)

---

### 12. **Kubernetes Downward API**
**What it does:**
- Allows pods to access their own metadata (name, namespace, IP, node name, etc.)
- Passed to containers as environment variables or mounted files

**In this project (helm/oke-app/templates/deployment.yaml):**
```yaml
env:
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: POD_IP
    valueFrom:
      fieldRef:
        fieldPath: status.podIP
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
```
- Application accesses these via `process.env.POD_NAME`, etc.
- Enables self-aware containerized applications

---

## 🔄 Deployment Flow (End-to-End)

```
Developer commits code to GitHub
        ↓
GitHub Actions triggered (lint-and-test job)
├─ Syntax check (Node.js)
├─ Helm lint
├─ Dependency vulnerability scan (Trivy)
└─ Status check on PR
        ↓
If PR approved & merged to main:
        ↓
GitHub Actions triggered (build-and-push job)
├─ Build Docker image
├─ Scan image (Trivy)
└─ Push to OCIR (tagged with commit SHA)
        ↓
GitHub Actions updates values.yaml with new tag
        ↓
Commit pushed back to GitHub
        ↓
ArgoCD detects change in Git
        ↓
ArgoCD deploys Helm chart to OKE
├─ Kubernetes pulls image from OCIR
├─ Creates new pod replicas
├─ Health checks pass (liveness/readiness probes)
└─ Load balancer routes traffic to healthy pods
        ↓
Application live with new version
```

---

## 🔐 Security Practices Implemented

1. **Container Security:**
   - Non-root user (`node`)
   - Minimal alpine base image
   - No build tools in production image
   - No privilege escalation allowed

2. **CI/CD Security:**
   - Vulnerability scanning (Trivy) before and after build
   - Pre-commit hooks prevent secrets from being committed
   - GitHub Actions use secrets management (not hardcoded)

3. **Access Control:**
   - Private OCIR repository (requires auth)
   - Kubernetes imagePullSecrets (credentials needed to pull image)
   - Non-root RBAC context in pods

4. **Network Security:**
   - Load balancer controls ingress
   - Service-to-service communication via Kubernetes DNS
   - No direct internet access to pod replicas

---

## 📋 Architecture Summary Table

| Component | Purpose | Status |
|-----------|---------|--------|
| OKE | Kubernetes orchestration | ✅ Running |
| Terraform | Infrastructure provisioning | ⚠️ State stored locally (need remote) |
| Docker | Container packaging | ✅ Secure |
| Helm | K8s deployment management | ✅ Configured |
| GitHub Actions | CI/CD automation | ✅ Functional |
| ArgoCD | GitOps sync controller | ✅ Syncing |
| Trivy | Security scanning | ✅ Integrated |
| OCIR | Container registry | ✅ Storing images |
| Node.js/Express | Application runtime | ✅ Running |

---

## 🚀 Next Steps / Recommendations

1. **Move Terraform State to OCI Object Storage** (addressed in companion doc)
   - Use OCI free-tier bucket
   - Add backend configuration for remote state management
   - Encrypt state file

2. **Add Pod Health Visualization** (addressed in companion doc)
   - Extend `/api/metrics` endpoint with health metrics
   - Display pod status, restart counts, resource usage in UI

3. **Enhanced Monitoring** (future)
   - Integrate Prometheus for metrics collection
   - Add Grafana dashboards
   - Set up alerts for pod failures

4. **Security Enhancements** (future)
   - Enable Pod Security Policies (PSPs)
   - Implement network policies
   - Add RBAC role definitions
   - Enable audit logging

---

## 📚 Key Configuration Files Reference

- **Deployment:** `helm/oke-app/templates/deployment.yaml`
- **Helm Values:** `helm/oke-app/values.yaml`
- **ArgoCD App:** `gitops/argocd-app.yaml`
- **CI/CD Pipeline:** `.github/workflows/ci-cd.yml`
- **Infrastructure:** `terraform/main.tf`, `terraform/variables.tf`
- **Application Code:** `app/app.js`
- **Container Image:** `app/Dockerfile`
- **Pre-commit Rules:** `.pre-commit-config.yaml`

