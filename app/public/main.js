document.addEventListener('DOMContentLoaded', () => {
    // Theme Switcher Logic
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check saved preference or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    // Cluster Stats Fetching Logic
    const podNameEl = document.getElementById('pod-name');
    const podNamespaceEl = document.getElementById('pod-namespace');
    const podIpEl = document.getElementById('pod-ip');
    const nodeNameEl = document.getElementById('node-name');
    const refreshBtn = document.getElementById('refresh-btn');
    
    async function fetchStats() {
        // Show loading state
        refreshBtn.classList.add('loading');
        const originalContent = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '⌛';
        refreshBtn.disabled = true;
        
        try {
            const response = await fetch('/api/info');
            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();
            
            // Populate values with a brief transition delay
            setTimeout(() => {
                podNameEl.textContent = data.podName;
                podNamespaceEl.textContent = data.podNamespace;
                podIpEl.textContent = data.podIp;
                nodeNameEl.textContent = data.nodeName;
                
                // End loading state
                refreshBtn.innerHTML = originalContent;
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('loading');
            }, 300);
            
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            podNameEl.textContent = 'Error loading stats';
            podNamespaceEl.textContent = 'Error';
            podIpEl.textContent = 'Error';
            nodeNameEl.textContent = 'Error';
            
            refreshBtn.innerHTML = originalContent;
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
        }
    }
    
    // Pod Health Metrics Fetching Logic
    async function fetchHealthMetrics() {
        try {
            const response = await fetch('/api/health-metrics');
            if (!response.ok) throw new Error('Failed to fetch health metrics');
            const data = await response.json();
            
            // Update memory metrics
            document.getElementById('memory-used').textContent = `${data.memory.usedMB}MB`;
            document.getElementById('memory-label').textContent = 
                `${data.memory.usedMB}MB / ${data.memory.limitMB}MB`;
            document.getElementById('memory-bar').style.width = `${data.memory.percentage}%`;
            
            // Update uptime
            document.getElementById('uptime-value').textContent = data.uptime.formatted;
            document.getElementById('uptime-label').textContent = data.uptime.formatted;
            
            // Update health status badge
            const statusDot = document.getElementById('status-dot');
            const statusText = document.getElementById('status-text');
            const healthStatus = data.health.status;
            
            statusText.textContent = healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1);
            statusDot.className = `status-indicator ${healthStatus === 'healthy' ? 'healthy' : 'warning'}`;
            
            // Update health checks
            const checksContainer = document.getElementById('health-checks');
            checksContainer.innerHTML = data.health.checks
                .map(check => `
                    <div class="health-check">
                        <span class="check-name">${check.name}</span>
                        <span class="check-status ${check.status}">${check.value}</span>
                    </div>
                `)
                .join('');
            
        } catch (error) {
            console.error('Failed to fetch health metrics:', error);
        }
    }
    
    // Initial fetch on load
    fetchStats();
    fetchHealthMetrics();
    
    // Fetch on click
    refreshBtn.addEventListener('click', fetchStats);
    
    // Auto-refresh health metrics every 5 seconds
    setInterval(fetchHealthMetrics, 5000);
});
