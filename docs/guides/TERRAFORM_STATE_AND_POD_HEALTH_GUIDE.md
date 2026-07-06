# Implementation Guide: Terraform Remote State & Pod Health Visualization

## Part 1: Moving Terraform State to OCI Object Storage

### Current Issue
**Problem:** Terraform state file is stored locally in `terraform/terraform.tfstate` within version control.
**Why it's problematic:**
- State contains sensitive data (resource IDs, credentials, configuration)
- Local state doesn't support team collaboration (conflicts, race conditions)
- Loss of file = loss of infrastructure tracking
- Backup and disaster recovery complexity

### Solution: OCI Object Storage Backend

OCI provides a free tier with **20GB/month** of Object Storage, perfect for Terraform state.

#### Step 1: Create OCI Object Storage Bucket

```bash
# Via OCI CLI (if installed)
oci os bucket create --compartment-id <COMPARTMENT_ID> --name terraform-state

# Or via OCI Console:
# 1. Navigate to Object Storage > Buckets
# 2. Create bucket "terraform-state"
# 3. Set to "Private" (don't make public!)
```

#### Step 2: Create Terraform Backend Configuration

Create file: `terraform/backend.tf`

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "oke-app/terraform.tfstate"
    region         = "uk-london-1"
    endpoint       = "https://lryo68b31h2j.compat.objectstorage.uk-london-1.oraclecloud.com"
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
  }
}
```

**OR using OCI-specific syntax:**

```hcl
terraform {
  backend "oci" {
    bucket  = "terraform-state"
    prefix  = "oke-app"
    region  = "uk-london-1"
  }
}
```

#### Step 3: Migrate State

```bash
cd terraform

# 1. Initialize backend (responds to prompts or use -reconfigure)
terraform init -reconfigure

# 2. Verify state is migrated
terraform state list

# 3. Remove local state file (after confirming migration worked)
rm terraform.tfstate terraform.tfstate.backup
```

#### Step 4: Update .gitignore

```bash
# Add to .gitignore to prevent future local state commits
echo "terraform/terraform.tfstate*" >> .gitignore
echo "terraform/.terraform*" >> .gitignore
echo "terraform/*.tfvars" >> .gitignore
```

#### Step 5: Add Backend Configuration to CI/CD

In `.github/workflows/ci-cd.yml`, when running Terraform:

```yaml
- name: Initialize Terraform
  run: |
    cd terraform
    terraform init -reconfigure \
      -backend-config="bucket=terraform-state" \
      -backend-config="key=oke-app/terraform.tfstate" \
      -backend-config="region=uk-london-1"
```

### Benefits
✅ Encrypted state at rest (OCI default)
✅ Versioning & backup built-in
✅ Team collaboration (single source of truth)
✅ Free tier eligible (20GB/month)
✅ Automatic locking (prevents concurrent modifications)

---

## Part 2: Adding Pod Health Visualization

### Current State
The application currently has a basic `/api/info` endpoint that returns pod metadata:
```json
{
  "status": "healthy",
  "hostname": "oke-app-abc123",
  "podName": "oke-app-abc123",
  "podNamespace": "default",
  "podIp": "10.0.1.50",
  "nodeName": "node-1",
  "platform": "Oracle Container Engine for Kubernetes (OKE)",
  "framework": "Node.js (v24.0.0)"
}
```

### Enhancement: Pod Health Metrics

#### New Endpoint: `GET /api/health-metrics`

This will return:
```json
{
  "status": "healthy",
  "pod": {
    "name": "oke-app-abc123",
    "namespace": "default",
    "ip": "10.0.1.50",
    "nodeName": "node-1"
  },
  "memory": {
    "usedMB": 45,
    "limitMB": 256,
    "percentage": 17.6
  },
  "cpu": {
    "percentage": 12.5
  },
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "health": {
    "status": "healthy",
    "checks": [
      {
        "name": "memory",
        "status": "ok",
        "value": "45MB / 256MB"
      },
      {
        "name": "uptime",
        "status": "ok",
        "value": "1 hour"
      }
    ]
  }
}
```

#### Implementation Details

**app/app.js** updates:

1. Import required modules:
```javascript
const os = require('os');
const v8 = require('v8');
```

2. Track pod startup time:
```javascript
const podStartTime = Date.now();
```

3. Add health metrics endpoint:
```javascript
app.get('/api/health-metrics', (req, res) => {
  const now = Date.now();
  const uptime = Math.floor((now - podStartTime) / 1000);
  
  // Memory usage
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const limitMB = parseInt(process.env.MEMORY_LIMIT || 256);
  const memPercentage = ((usedMB / limitMB) * 100).toFixed(1);
  
  // Health status
  const isHealthy = usedMB < limitMB * 0.9; // Alert if >90% usage
  
  res.json({
    status: isHealthy ? 'healthy' : 'warning',
    pod: {
      name: process.env.POD_NAME || os.hostname(),
      namespace: process.env.POD_NAMESPACE || 'default',
      ip: process.env.POD_IP || '127.0.0.1',
      nodeName: process.env.NODE_NAME || 'Unknown'
    },
    memory: {
      usedMB,
      limitMB,
      percentage: parseFloat(memPercentage)
    },
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime)
    },
    health: {
      status: isHealthy ? 'healthy' : 'warning',
      checks: [
        {
          name: 'memory',
          status: usedMB < limitMB * 0.9 ? 'ok' : 'warning',
          value: `${usedMB}MB / ${limitMB}MB`
        },
        {
          name: 'uptime',
          status: uptime > 30 ? 'ok' : 'starting',
          value: formatUptime(uptime)
        }
      ]
    }
  });
});

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
```

#### Frontend Visualization (public/index.html)

Add new section to display pod health:

```html
<div class="pod-health-container">
  <h2>Pod Health Status</h2>
  
  <div class="metrics-grid">
    <!-- Memory Usage -->
    <div class="metric-card">
      <h3>Memory Usage</h3>
      <div class="metric-value" id="memoryValue">--</div>
      <div class="progress-bar">
        <div class="progress-fill" id="memoryBar" style="width: 0%"></div>
      </div>
      <p class="metric-label" id="memoryLabel">0MB / 256MB</p>
    </div>
    
    <!-- Pod Uptime -->
    <div class="metric-card">
      <h3>Pod Uptime</h3>
      <div class="metric-value" id="uptimeValue">--</div>
      <p class="metric-label" id="uptimeLabel">0s</p>
    </div>
    
    <!-- Health Status -->
    <div class="metric-card">
      <h3>Health Status</h3>
      <div class="health-status" id="healthStatus">
        <span class="status-badge" id="statusBadge">--</span>
      </div>
      <div id="healthChecks" class="health-checks"></div>
    </div>
  </div>
</div>
```

#### CSS Styles (public/styles.css)

```css
.pod-health-container {
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #00d4ff;
  margin: 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #00f0ff);
  transition: width 0.3s ease;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.5);
}

.status-badge.warning {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
  border-color: rgba(255, 165, 0, 0.5);
}

.health-checks {
  margin-top: 1rem;
  font-size: 0.9rem;
}

.health-check {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.health-check:last-child {
  border-bottom: none;
}

.check-status {
  font-weight: 600;
}

.check-status.ok {
  color: #00ff88;
}

.check-status.warning {
  color: #ffa500;
}
```

#### JavaScript Auto-Refresh (public/main.js)

```javascript
async function fetchHealthMetrics() {
  try {
    const response = await fetch('/api/health-metrics');
    const data = await response.json();
    
    // Update memory
    document.getElementById('memoryValue').textContent = `${data.memory.usedMB}MB`;
    document.getElementById('memoryLabel').textContent = 
      `${data.memory.usedMB}MB / ${data.memory.limitMB}MB`;
    document.getElementById('memoryBar').style.width = `${data.memory.percentage}%`;
    
    // Update uptime
    document.getElementById('uptimeValue').textContent = data.uptime.formatted;
    
    // Update health status
    const badge = document.getElementById('statusBadge');
    badge.textContent = data.health.status.toUpperCase();
    badge.className = `status-badge ${data.health.status === 'healthy' ? '' : 'warning'}`;
    
    // Update health checks
    const checksContainer = document.getElementById('healthChecks');
    checksContainer.innerHTML = data.health.checks
      .map(check => `
        <div class="health-check">
          <span>${check.name}</span>
          <span class="check-status ${check.status}">${check.value}</span>
        </div>
      `)
      .join('');
    
  } catch (error) {
    console.error('Failed to fetch health metrics:', error);
  }
}

// Refresh every 5 seconds
setInterval(fetchHealthMetrics, 5000);

// Initial load
fetchHealthMetrics();
```

---

## Part 3: ArgoCD Detailed Explanation

### What is ArgoCD?

ArgoCD is a **declarative, GitOps continuous delivery tool** for Kubernetes. It continuously monitors a Git repository and automatically syncs cluster state to match the desired state defined in Git.

### How It Works in This Project

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Workflow                      │
└─────────────────────────────────────────────────────────────┘

1. Developer makes code change → commits to GitHub
   ↓
2. GitHub Actions CI/CD pipeline triggered
   ├─ Tests, scans, lints code
   ├─ Builds Docker image
   ├─ Pushes image to OCIR
   └─ Updates Helm values.yaml with new image tag → commits back
   ↓
3. ArgoCD detects change in Git repository
   ↓
4. ArgoCD reads Helm chart (helm/oke-app) from GitHub
   ↓
5. ArgoCD renders Helm templates using values.yaml
   ↓
6. ArgoCD applies manifests to OKE cluster
   ├─ Updates Deployment (new image tag)
   ├─ Kubernetes terminates old pods
   └─ Kubernetes creates new pods with new image
   ↓
7. New pods pull image from OCIR
   ↓
8. Load balancer routes traffic to new healthy pods
```

### Key Components

**ArgoCD Application (gitops/argocd-app.yaml):**
- **spec.source.repoURL:** GitHub repository to monitor
- **spec.source.path:** Path to Helm chart in repo
- **spec.destination.server:** Kubernetes cluster to deploy to
- **spec.syncPolicy.automated:** Auto-sync enabled (don't wait for manual approval)

### Why ArgoCD?

| Aspect | Traditional CI/CD | ArgoCD GitOps |
|--------|------------------|---------------|
| **Deployment trigger** | Manual command or webhook | Git commit automatically |
| **Source of truth** | Jenkins/GitHub Actions config | Git repository |
| **Drift detection** | Manual checks | Continuous monitoring |
| **Rollback** | Redeploy previous version | Revert Git commit |
| **Audit trail** | Pipeline logs | Git history |
| **Multi-cluster** | Duplicate pipelines | Single Git repo, multiple ArgoCD instances |
| **Separation of concerns** | Builds & deploys together | Build (CI) separate from Deploy (CD) |

### ArgoCD Sync Policies Explained

In `gitops/argocd-app.yaml`:

```yaml
syncPolicy:
  automated:
    prune: true        # Delete resources removed from Git
    selfHeal: true     # Revert cluster changes not from Git
  syncOptions:
    - CreateNamespace=true  # Auto-create namespace if missing
```

**Self-heal example:**
- Git says: 2 replicas
- Someone manually scales to 3 replicas in cluster
- ArgoCD detects drift
- ArgoCD resets to 2 replicas (from Git)

**Prune example:**
- Helm chart removes a ConfigMap from values
- ArgoCD detects ConfigMap is no longer in desired state
- ArgoCD deletes ConfigMap from cluster

---

## Comparison: Tools and Their Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                    Development Workflow                      │
└──────────────────────────────────────────────────────────────┘

Pre-commit hooks    ← Local developer machine (runs on git commit)
       ↓
GitHub Actions (CI) ← Triggered by push/PR (linting, testing)
       ↓
Docker             ← Builds container image
       ↓
Trivy              ← Security scans image
       ↓
OCIR               ← Stores image artifact
       ↓
GitHub (Git)       ← Helm chart repository (desired state)
       ↓
ArgoCD             ← Syncs Git → Kubernetes
       ↓
Terraform          ← Infrastructure (registry, networking)
       ↓
OKE                ← Runs containerized app
       ↓
Load Balancer      ← Routes traffic to pods
       ↓
End User           ← Accesses application
```

---

## Implementation Checklist

### Remote Terraform State
- [ ] Create OCI Object Storage bucket
- [ ] Create `terraform/backend.tf`
- [ ] Run `terraform init -reconfigure`
- [ ] Verify state migrated
- [ ] Update `.gitignore`
- [ ] Update CI/CD pipeline (if applicable)

### Pod Health Visualization
- [ ] Update `app/app.js` with `/api/health-metrics` endpoint
- [ ] Add memory tracking logic
- [ ] Add uptime calculation
- [ ] Update `public/index.html` with health visualization
- [ ] Add CSS styles for metrics display
- [ ] Add `public/main.js` auto-refresh logic
- [ ] Test locally: `npm start`
- [ ] Push code → GitHub Actions → ArgoCD syncs to cluster

