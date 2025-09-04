#!/bin/bash

echo "=== Kiosk Fix Script ==="
echo "Fixing package installation issues"

# Install correct packages
echo "Installing correct packages..."
apt install -y chromium lightdm openbox unclutter

# Enable lightdm service
echo "Enabling display manager..."
systemctl enable lightdm

# Update kiosk autostart with correct chromium command
echo "Updating kiosk browser config..."
mkdir -p /home/kiosk/.config/openbox
cat > /home/kiosk/.config/openbox/autostart << 'EOF'
# Display settings for 24/7 use
xset s off &
xset -dpms &
xset s noblank &
unclutter -idle 2 &

# Start signage in kiosk mode (correct chromium command)
chromium \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-dev-shm-usage \
  --disable-gpu-sandbox \
  https://tp-signage.netlify.app/ &
EOF

chown -R kiosk:kiosk /home/kiosk/.config/

echo ""
echo "=== Fix Complete! ==="
echo "Now reboot the system: reboot"