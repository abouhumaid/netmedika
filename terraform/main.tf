provider "aws" {
  region = "us-east-1"  # Change if needed
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  owners = ["099720109477"] # Canonical's AWS account ID
}

# ----------------------------------------
# NETWORK: Create VPC
# ----------------------------------------
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

# ----------------------------------------
# NETWORK: Create Public Subnet
# ----------------------------------------
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true  # Auto-assign public IP

  tags = {
    Name = "public-subnet"
  }
}

# ----------------------------------------
# NETWORK: Internet Gateway (for internet access)
# ----------------------------------------
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

# ----------------------------------------
# NETWORK: Route Table (allow internet traffic)
# ----------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"              # Allow all outbound traffic
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "public-rt"
  }
}

# ----------------------------------------
# NETWORK: Associate route table with subnet
# ----------------------------------------
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ----------------------------------------
# SECURITY: Allow SSH access
# ----------------------------------------
resource "aws_security_group" "ssh" {
  name        = "allow_ssh"
  description = "Allow SSH access"
  vpc_id      = aws_vpc.main.id

  # Inbound rule (SSH)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # ⚠️ Restrict in production
  }

  # Outbound rule (allow all)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ----------------------------------------
# COMPUTE: EC2 Instance
# ----------------------------------------
resource "aws_instance" "netmedika_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"  # Better than t2.micro
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ssh.id]
  associate_public_ip_address = true

  key_name = "netmedika-key" # Replace with your AWS key pair

  tags = {
    Name = "api-server"
  }
}

# ----------------------------------------
# OUTPUTS: Useful info after deployment
# ----------------------------------------
output "public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.netmedika_server.public_ip
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i netmedika-key.pem ubuntu@${aws_instance.netmedika_server.public_ip}"
}