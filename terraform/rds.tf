# ----------------------------------------
# DATABASE: PostgreSQL RDS Instance
# ----------------------------------------
resource "aws_db_instance" "netmedika_db" {
  identifier             = "netmedika-postgres-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "16.3"
  instance_class         = "db.t3.micro"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
  multi_az               = false

  tags = {
    Name = "netmedika-postgres-db"
  }
}

output "rds_endpoint" {
  description = "Endpoint of the RDS PostgreSQL instance"
  value       = aws_db_instance.netmedika_db.endpoint
}

output "rds_database_name" {
  description = "Database name created in the RDS instance"
  value       = aws_db_instance.netmedika_db.db_name
}

output "ec2_rds_psql_command" {
  description = "Command to run on the EC2 instance to connect to RDS"
  value       = "PGPASSWORD='${var.db_password}' psql -h ${aws_db_instance.netmedika_db.address} -p ${aws_db_instance.netmedika_db.port} -U ${var.db_username} -d ${aws_db_instance.netmedika_db.db_name}"
  sensitive   = true
}
