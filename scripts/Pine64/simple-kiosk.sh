#!/bin/bash

echo "=== Eenvoudige Kiosk Setup ==="
echo "Fallback to getty autologin..."

# Disable alle display managers
systemctl disable lightdm 2>/dev/null || true
systemctl disable nodm 2>/dev/null || true
systemctl disable gdm3 2>/dev/null || true

# Setup getty autologin voor tty1
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --noissue --autologin kiosk %I $TERM
Type=idle
EOF

# Install xinit (voor startx)
apt install -y xinit

# Create .bashrc voor automatische X start
cat > /home/kiosk/.bashrc << 'EOF'
# Auto start X on login (only on tty1)
if [ -z "$DISPLAY" ] && [ "$XDG_VTNR" = 1 ]; then
    exec startx
fi
EOF

# Create .xinitrc voor X startup
cat > /home/kiosk/.xinitrc << 'EOF'
#!/bin/bash

# Start openbox window manager
openbox &

# Display settings
xset s off
xset -dpms  
xset s noblank
unclutter -idle 2 &

# Wait for window manager
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

chmod +x /home/kiosk/.xinitrc
chown kiosk:kiosk /home/kiosk/.bashrc /home/kiosk/.xinitrc

# Reload systemd
systemctl daemon-reload

echo ""
echo "=== Simple Kiosk Setup Complete! ==="
echo "This uses console autologin + startx"
echo "Reboot now: reboot"