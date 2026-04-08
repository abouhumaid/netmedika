# ----------------------------------------
# COMPUTE: EC2 Instance
# ----------------------------------------
resource "aws_instance" "netmedika_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ssh.id]
  associate_public_ip_address = true

  key_name = "netmedika-key"

  user_data = <<-EOF
              #!/bin/bash
              set -e

              apt update -y

              # Install Docker, Python3, Git, curl, and PostgreSQL client
              apt install -y docker.io python3 python3-pip git curl postgresql-client

              # Start and enable Docker
              systemctl start docker
              systemctl enable docker

              # Allow ubuntu user to run docker
              usermod -aG docker ubuntu

              # Store the RDS connection details for the application and manual psql access
              cat <<'DBEOF' >/home/ubuntu/netmedika-db.env
              DB_HOST=${aws_db_instance.netmedika_db.address}
              DB_PORT=${aws_db_instance.netmedika_db.port}
              DB_NAME=${aws_db_instance.netmedika_db.db_name}
              DB_USER=${var.db_username}
              DB_PASSWORD=${var.db_password}
              DATABASE_URL=postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.netmedika_db.address}:${aws_db_instance.netmedika_db.port}/${aws_db_instance.netmedika_db.db_name}
              DBEOF

              chown ubuntu:ubuntu /home/ubuntu/netmedika-db.env
              chmod 600 /home/ubuntu/netmedika-db.env
              EOF

  depends_on = [aws_db_instance.netmedika_db]

  tags = {
    Name = "api-server"
  }
}

output "public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.netmedika_server.public_ip
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i netmedika-key.pem ubuntu@${aws_instance.netmedika_server.public_ip}"
}
