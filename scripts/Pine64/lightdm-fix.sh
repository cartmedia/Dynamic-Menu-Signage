#!/bin/bash

echo "=== LightDM Fix Script ==="
echo "Installing missing dependencies..."

# Install accountsservice voor org.freedesktop.Accounts
apt install -y accountsservice

# Install GTK greeter voor lightdm
apt install -y lightdm-gtk-greeter

# Alternatief: gebruik nodm (simpeler voor kiosk)
echo "Installing nodm as backup option..."
apt install -y nodm

# Configure nodm voor kiosk user
cat > /etc/default/nodm << 'EOF'
# nodm configuration

# User to autologin for
NODM_USER=kiosk

# First vt to try when looking for free VTs
NODM_FIRST_VT=7

# X session
NODM_XSESSION=/etc/X11/Xsession

# Options for the X server
NODM_X_OPTIONS='-nolisten tcp'

# If an X session will run
NODM_ENABLED=true
EOF

# Disable lightdm, enable nodm
systemctl disable lightdm
systemctl enable nodm

# Create simple .xsession voor kiosk user
cat > /home/kiosk/.xsession << 'EOF'
#!/bin/bash

# Start openbox window manager
openbox &

# Display settings
xset s off
xset -dpms  
xset s noblank
unclutter -idle 2 &

# Wait for X to be ready
sleep 2

# Start kiosk browser
exec chromium \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-dev-shm-usage \
  --disable-gpu-sandbox \
  https://tp-signage.netlify.app/
EOF

chmod +x /home/kiosk/.xsession
chown kiosk:kiosk /home/kiosk/.xsession

echo ""
echo "=== Fix Complete! ==="
echo "Using nodm instead of lightdm (simpler for kiosk)"
echo "Reboot now: reboot"