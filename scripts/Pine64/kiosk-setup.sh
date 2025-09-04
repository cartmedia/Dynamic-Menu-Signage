#!/bin/bash

echo "=== Pine64 Kiosk Setup Script ==="
echo "Run this as root: sudo bash kiosk-setup.sh"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash $0"
    exit 1
fi

echo "1. Creating users..."
# Admin user with sudo rights
adduser admin
usermod -aG sudo admin

# Kiosk user without rights
adduser --disabled-password --gecos "Digital Signage" kiosk
usermod -a -G netdev kiosk

echo "2. Installing desktop environment..."
apt update
apt install -y openbox chromium-browser unclutter lightdm

echo "3. Configuring autologin..."
mkdir -p /etc/lightdm/lightdm.conf.d/
cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf << 'EOF'
[Seat:*]
autologin-user=kiosk
autologin-user-timeout=0
user-session=openbox
EOF

echo "4. Setting up kiosk browser..."
mkdir -p /home/kiosk/.config/openbox
cat > /home/kiosk/.config/openbox/autostart << 'EOF'
# Display settings for 24/7 use
xset s off &
xset -dpms &
xset s noblank &
unclutter -idle 2 &

# Start signage in kiosk mode
chromium-browser \
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

echo "5. Creating admin scripts..."
mkdir -p /home/admin/scripts

# Kiosk restart script
cat > /home/admin/scripts/restart-kiosk << 'EOF'
#!/bin/bash
echo "Stopping kiosk processes..."
pkill -u kiosk chromium-browser
sleep 2
echo "Restarting display manager..."
systemctl restart lightdm
sleep 3
echo "Kiosk restarted successfully!"
EOF

# WiFi management script
cat > /home/admin/scripts/setup-wifi << 'EOF'
#!/bin/bash
echo "=== WiFi Setup ==="
echo "Scanning for networks..."
iwlist wlan0 scan | grep ESSID | sed 's/.*ESSID:"\(.*\)"/\1/' | head -10
echo ""
read -p "Enter SSID: " ssid
read -s -p "Enter Password: " pass
echo ""
echo "Configuring WiFi..."
wpa_passphrase "$ssid" "$pass" | tee -a /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null
wpa_cli reconfigure
echo "WiFi configured. Testing connection..."
sleep 5
if ping -c 3 google.com > /dev/null 2>&1; then
    echo "✅ WiFi connection successful!"
    ip addr show wlan0 | grep inet
else
    echo "❌ Connection failed. Check credentials."
fi
EOF

# System status script
cat > /home/admin/scripts/status << 'EOF'
#!/bin/bash
echo "=== Pine64 Signage Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Temperature: $(vcgencmd measure_temp 2>/dev/null || echo 'N/A')"
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Disk Usage ==="
df -h / | tail -1
echo ""
echo "=== Network Status ==="
ip addr show | grep -E "(wlan0|eth0)" -A 2 | grep inet || echo "No network connection"
echo ""
echo "=== Kiosk Status ==="
if pgrep -u kiosk chromium-browser > /dev/null; then
    echo "✅ Chromium running (PID: $(pgrep -u kiosk chromium-browser))"
else
    echo "❌ Chromium not running"
fi
EOF

chmod +x /home/admin/scripts/*
chown -R admin:admin /home/admin/scripts/

echo "6. Configuring SSH security..."
cat >> /etc/ssh/sshd_config << 'EOF'

# Security settings
AllowUsers admin signage
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
EOF

systemctl restart ssh

echo "7. Enabling services..."
systemctl enable lightdm

echo ""
echo "=== Setup Complete! ==="
echo "Next steps:"
echo "1. Reboot the system: reboot"
echo "2. SSH as admin: ssh admin@pine64.local"
echo "3. Use admin scripts:"
echo "   - ~/scripts/status"
echo "   - ~/scripts/restart-kiosk"
echo "   - ~/scripts/setup-wifi"
echo ""
echo "The kiosk will auto-start after reboot!"