# Deployment Files

This directory contains environment-specific deployment configurations that are **NOT** committed to the repository.

## Directory Structure

```
deployment/
├── rpi/                    # Raspberry Pi production deployment
│   ├── application.properties  # RPI-specific Spring Boot config
│   ├── scada-system.service    # systemd service file
│   └── rpi-setup.sh            # Initial RPI setup script
└── README.md               # This file
```

## Why These Files Are Not Committed

These files contain:
- Environment-specific IP addresses
- Database passwords
- Network configurations
- System paths specific to target hardware

Each deployment environment (development, staging, production, demo) may have different values.

## How to Use

### For Raspberry Pi Deployment

1. **Copy template files from project root** (if they exist as templates)
2. **Create your configuration files** in `deployment/rpi/`:
   - `application.properties` - Spring Boot configuration for RPI
   - `scada-system.service` - systemd service definition
   - `rpi-setup.sh` - Initial setup script

3. **Customize for your environment**:
   - Update IP addresses
   - Change database passwords
   - Adjust resource limits
   - Configure CORS origins

4. **Deploy to RPI**:
   ```bash
   # Copy config
   scp deployment/rpi/application.properties pi@<RPI_IP>:/opt/scada-system/config/

   # Copy systemd service
   scp deployment/rpi/scada-system.service pi@<RPI_IP>:~/
   ssh pi@<RPI_IP> "sudo cp ~/scada-system.service /etc/systemd/system/"

   # Run setup script (first time only)
   scp deployment/rpi/rpi-setup.sh pi@<RPI_IP>:~/
   ssh pi@<RPI_IP> "chmod +x ~/rpi-setup.sh && ./rpi-setup.sh"
   ```

## Template Files

Example templates can be found in project documentation:
- See `BACKEND-IMPLEMENTATION.md` for application.properties examples
- See `CI-CD-SETUP.md` for deployment configuration

## Security Notes

- **Never commit** these files with production passwords
- Use environment variables where possible (e.g., `${CORS_ALLOWED_ORIGINS}`)
- Keep separate configs for different environments
- Rotate passwords regularly
- Use SSH keys for deployment authentication

## Environment Variables

Recommended environment variables to use:

```bash
# On RPI, set in /etc/environment or systemd service
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://192.168.1.9:3000
DB_PASSWORD=your_secure_password
MQTT_USERNAME=your_mqtt_user
MQTT_PASSWORD=your_mqtt_password
```
