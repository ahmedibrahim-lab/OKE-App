import os
import socket
from flask import Flask, jsonify, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/info")
def get_info():
    # Gather environment metadata, showing details from K8s downward env vars if present
    pod_name = os.getenv("POD_NAME", socket.gethostname())
    pod_namespace = os.getenv("POD_NAMESPACE", "default")
    pod_ip = os.getenv("POD_IP", "127.0.0.1")
    node_name = os.getenv("NODE_NAME", "Unknown Node")
    
    return jsonify({
        "status": "healthy",
        "hostname": socket.gethostname(),
        "podName": pod_name,
        "podNamespace": pod_namespace,
        "podIp": pod_ip,
        "nodeName": node_name,
        "platform": "Oracle Container Engine for Kubernetes (OKE)",
        "framework": "Flask (Python 3.11)"
    })

if __name__ == "__main__":
    # In production, this runs via Gunicorn, but for development we run directly.
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
