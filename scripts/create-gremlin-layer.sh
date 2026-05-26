#!/bin/bash
set -e

echo "Creating Gremlin dependencies layer..."

# Create temp directory
rm -rf /tmp/gremlin-layer
mkdir -p /tmp/gremlin-layer/python

# Install gremlinpython
pip install gremlinpython -t /tmp/gremlin-layer/python/

# Create zip
cd /tmp/gremlin-layer
zip -qr gremlin-deps-layer.zip python/

echo "✓ Layer created at /tmp/gremlin-layer/gremlin-deps-layer.zip"
echo "Size: $(du -h /tmp/gremlin-layer/gremlin-deps-layer.zip | cut -f1)"
