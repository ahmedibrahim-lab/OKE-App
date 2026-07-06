# OKE-App Tools Quick Reference

## 🎯 Tool Matrix: What Each Tool Does

| Tool | Purpose | In This Project | Key Files |
|------|---------|-----------------|-----------|
| **OKE** | Kubernetes cluster | Hosts running app pods | N/A (cloud service) |
| **Terraform** | IaC provisioning | Creates OCIR registry | `terraform/main.tf` |
| **Docker** | Container packaging | Builds app image | `app/Dockerfile` |
| **Helm** | K8s templating | Deploys app to OKE | `helm/oke-app/` |
| **GitHub Actions** | CI/CD automation | Build/test/scan/push | `.github/workflows/ci-cd.yml` |
| **ArgoCD** | GitOps syncing | Continuous deployment | `gitops/argocd-app.yaml` |
| **Trivy** | Security scanning | Scans images for CVEs | Integrated in GitHub Actions |
| **Pre-commit** | Local quality gates | Validates code before commit | `.pre-commit-config.yaml` |
| **Node.js/Express** | App runtime | Serves backend + frontend | `app/app.js` |
| **OCIR** | Docker registry | Stores built images | Registry in OCI |
| **Load Balancer** | Traffic routing | External access to pods | Created via Helm service |
| **Downward API** | Pod metadata | Access pod info in app | `helm/oke-app/templates/deployment.yaml` |

---

## 📊 Data Flow Diagram

```
┌─ DEVELOPMENT PHASE ──────────────────────────────┐
│ Developer edits code                             │
│ ↓ Pre-commit hooks (format, lint, syntax check) │
│ ↓ Commits to GitHub main branch                 │
└──────────────────────────────────────────────────┘
         ↓
┌─ CI/CD PHASE ────────────────────────────────────┐
│ GitHub Actions triggered                        │
│ ├─ Linting (Node.js syntax, Helm lint)          │
│ ├─ Testing                                      │
│ ├─ Security scan (Trivy)                        │
│ ├─ Docker build                                 │
│ ├─ Image scan (Trivy)                           │
│ ├─ Push to OCIR                                 │
│ └─ Update Helm values.yaml + commit             │
└──────────────────────────────────────────────────┘
         ↓
┌─ GITOPS PHASE ───────────────────────────────────┐
│ ArgoCD detects Git change                       │
│ ├─ Reads Helm chart from Git                    │
│ ├─ Renders templates with values.yaml           │
│ └─ Applies manifests to OKE cluster             │
│         ↓                                       │
│ ┌─ KUBERNETES PHASE ────────────────┐           │
│ │ Deployment updated                │           │
│ │ ├─ Pulls image from OCIR          │           │
│ │ ├─ Terminates old pods            │           │
│ │ ├─ Creates new pods               │           │
│ │ └─ Health checks (liveness/ready) │           │
│ │         ↓                         │           │
│ │ Load Balancer routes traffic      │           │
│ │ to healthy pods                   │           │
│ └───────────────────────────────────┘           │
└──────────────────────────────────────────────────┘
         ↓
┌─ USER ACCESS ────────────────────────────────────┐
│ Browser → Load Balancer IP:80                   │
│         → Pod replicas (port 5000)              │
│         → API endpoints + UI                    │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Tool Interactions

### Build Chain
```
Code → Docker → OCIR
         ↓ scanned by Trivy
```

### Deploy Chain
```
Helm Chart (Git) → ArgoCD → OKE Kubernetes
     ↓
Values populated at deploy time
```

### Cluster Access Chain
```
Load Balancer → OKE → Pod Replicas → Node.js Express
                        ↓
                   Liveness/Readiness Probes
```

---

## 📋 Configuration Files Purpose

| File | Purpose | When to Edit |
|------|---------|--------------|
| `.github/workflows/ci-cd.yml` | CI/CD pipeline | To add tests, change image scan rules, add deployment steps |
| `terraform/main.tf` | Infrastructure | To add cloud resources (storage, networking, etc) |
| `terraform/variables.tf` | Terraform inputs | To change region, repository name, etc |
| `terraform/backend.tf` | Remote state config | After setting up OCI Object Storage bucket |
| `helm/oke-app/values.yaml` | Deployment config | To change replicas, resource limits, security context |
| `helm/oke-app/templates/deployment.yaml` | Pod definition | To add containers, volumes, environment variables |
| `helm/oke-app/templates/service.yaml` | Service routing | To change port mappings, load balancer type |
| `gitops/argocd-app.yaml` | GitOps controller | To change GitHub repo URL, sync policy, target namespace |
| `app/app.js` | Application logic | To add API endpoints, business logic |
| `app/public/index.html` | Frontend structure | To add/remove UI sections |
| `app/public/style.css` | Styling | To customize colors, fonts, responsive layout |
| `.pre-commit-config.yaml` | Local validation | To enforce additional code quality rules |

---

## 🚀 Deployment Sequence

### First Deployment (from scratch)
1. **Terraform:** Create OCIR registry
   ```bash
   cd terraform && terraform apply
   ```
2. **GitHub Secrets:** Add OCI credentials
3. **Kubernetes:** Create imagePullSecret for OCIR
4. **GitHub:** Merge code to main branch
5. **GitHub Actions:** Builds and pushes image
6. **Helm:** Pre-configured and ready
7. **ArgoCD:** Apply argocd-app.yaml to cluster
8. **ArgoCD:** Automatically deploys Helm chart

### Subsequent Deployments
1. Developer commits code → GitHub
2. GitHub Actions runs CI/CD
3. Pushes image with new tag → OCIR
4. Updates values.yaml → Commits to Git
5. ArgoCD detects change → Auto-deploys
6. Done (automatic, no manual intervention)

---

## 🔐 Security Layers

| Layer | Tool | What It Does |
|-------|------|--------------|
| Pre-commit | Pre-commit hooks | Detects secrets before commit |
| Build-time | Trivy | Scans dependencies |
| Image-time | Trivy | Scans built image |
| Runtime | Helm Security Context | Non-root user, dropped capabilities |
| Kubernetes | Liveness/Readiness Probes | Removes unhealthy pods |
| Registry | OCIR IAM | Controls who can pull/push |
| State | Terraform encryption | Protects infrastructure state |

---

## 📞 Troubleshooting by Tool

### Issue: Pod not deploying
- Check ArgoCD sync status (UI or CLI)
- Verify image exists in OCIR
- Check imagePullSecret exists in cluster

### Issue: Application not responsive
- Check pod liveness/readiness probes
- Verify Helm values (resource limits, probes)
- Check logs: `kubectl logs -f <pod-name>`

### Issue: GitHub Actions failing
- Check pre-commit hooks
- Review Trivy scan results
- Verify OCI credentials in GitHub Secrets

### Issue: Terraform state issues
- Check backend.tf configuration
- Verify OCI Object Storage bucket exists
- Run `terraform init -reconfigure`

### Issue: Load balancer not working
- Verify service type is LoadBalancer in values.yaml
- Check OCI security lists/NSGs
- Ensure pods are healthy (Running phase)

---

## 🎓 Learning Path

**Beginner:**
1. Understand Docker & containers
2. Learn Kubernetes basics (pods, services, deployments)
3. Understand GitOps concept

**Intermediate:**
1. Learn Helm templating
2. Understand GitHub Actions workflows
3. Learn ArgoCD synchronization

**Advanced:**
1. Master Terraform IaC patterns
2. Implement advanced security scanning
3. Set up monitoring/observability

---

## 💡 Key Concepts

### Infrastructure as Code (Terraform)
- Declare desired state in HCL
- Terraform provisions resources
- State file tracks actual state
- Changes are reproducible and auditable

### GitOps (ArgoCD)
- Git is source of truth
- Desired state defined in Git
- ArgoCD ensures cluster matches Git
- Drift detection and auto-correction

### DevSecOps (GitHub Actions + Trivy)
- Automate security checks
- Scan code, dependencies, images
- Fail fast on vulnerabilities
- Prevent insecure code from production

### Containerization (Docker)
- Package app with all dependencies
- Lightweight alternative to VMs
- Consistent across environments
- Secure with minimal attack surface

---

## 📞 Contact Points

To troubleshoot or modify the project:

| Aspect | Location | Owner |
|--------|----------|-------|
| Application code | `app/` | Backend/Frontend Developer |
| Infrastructure | `terraform/` | DevOps/Infrastructure Engineer |
| Deployment config | `helm/` | DevOps/SRE |
| CI/CD pipeline | `.github/workflows/` | DevOps/Build Engineer |
| GitOps controller | `gitops/` | DevOps/Platform Engineer |
| Container image | `app/Dockerfile` | Backend Developer/DevOps |

---

## 🔄 Typical Change Workflow

```
1. Developer: Edit code (app/app.js, frontend, etc)
2. Developer: Commit and push to branch
3. GitHub: Run pre-commit hooks locally (or remote CI)
4. Developer: Create Pull Request
5. GitHub Actions: Run linting, testing, security scan
6. Reviewer: Approve PR
7. Developer: Merge to main
8. GitHub Actions: Build image, scan, push to OCIR
9. GitHub Actions: Update Helm values.yaml
10. Git: Commit image tag update
11. ArgoCD: Detect Git change
12. ArgoCD: Sync Helm chart to OKE
13. Kubernetes: Deploy new pods
14. Load Balancer: Route traffic to new pods
15. Done! ✨
```

---

## 🎯 What Each Tool Is NOT

| Tool | Not Used For |
|------|--------------|
| Terraform | Running application (only provisioning cloud resources) |
| Docker | Orchestrating containers (only packaging) |
| Helm | Running containers (only templating, OKE runs them) |
| GitHub Actions | Deploying directly (only building/testing, ArgoCD deploys) |
| ArgoCD | Building images (only syncing, GitHub Actions builds) |
| Trivy | Fixing vulnerabilities (only detecting, dev team fixes) |
| Pre-commit | Enforcing in CI (only pre-commit time, GitHub Actions enforces) |

---

## 📚 Additional Resources

For each tool, comprehensive documentation was created in:
- `TOOLS_AND_ARCHITECTURE_EXPLANATION.md` - Deep dive per tool
- `TERRAFORM_STATE_AND_POD_HEALTH_GUIDE.md` - Implementation guides
- `IMPLEMENTATION_SUMMARY.md` - Change summary and next steps

