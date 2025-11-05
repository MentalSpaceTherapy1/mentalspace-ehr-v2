#!/usr/bin/env python3
"""
Add your laptop IP to the RDS security group to allow database connections
"""
import boto3
import sys

# Your laptop's public IP
YOUR_IP = "70.233.179.249/32"

print("=" * 60)
print("Add Laptop IP to RDS Security Group")
print("=" * 60)
print(f"\nYour Public IP: {YOUR_IP}")
print("\nThis script will add your IP to the RDS security group.")
print("\nYou'll need AWS credentials. Get them from:")
print("AWS Console → IAM → Users → Your User → Security Credentials → Create Access Key")
print("\n" + "=" * 60)

# Get AWS credentials
aws_access_key = input("\nEnter AWS Access Key ID: ").strip()
aws_secret_key = input("Enter AWS Secret Access Key: ").strip()

if not aws_access_key or not aws_secret_key:
    print("\n❌ Error: AWS credentials are required")
    sys.exit(1)

try:
    # Create boto3 client
    print("\n🔄 Connecting to AWS...")
    ec2 = boto3.client(
        'ec2',
        region_name='us-east-1',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )

    rds = boto3.client(
        'rds',
        region_name='us-east-1',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )

    # Get RDS instance details
    print("🔄 Finding RDS instance...")
    response = rds.describe_db_instances(DBInstanceIdentifier='mentalspace-ehr-prod')
    db_instance = response['DBInstances'][0]
    security_groups = db_instance['VpcSecurityGroups']

    if not security_groups:
        print("❌ No security groups found for RDS instance")
        sys.exit(1)

    sg_id = security_groups[0]['VpcSecurityGroupId']
    print(f"✅ Found security group: {sg_id}")

    # Add inbound rule
    print(f"\n🔄 Adding your IP ({YOUR_IP}) to security group...")
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {
                'IpProtocol': 'tcp',
                'FromPort': 5432,
                'ToPort': 5432,
                'IpRanges': [
                    {
                        'CidrIp': YOUR_IP,
                        'Description': 'Development laptop - Local development access'
                    }
                ]
            }
        ]
    )

    print("\n" + "=" * 60)
    print("✅ SUCCESS! Your IP has been added to the RDS security group")
    print("=" * 60)
    print("\nYour backend should now be able to connect to the database.")
    print("Check your backend terminal - it should reconnect automatically.\n")

except Exception as e:
    error_msg = str(e)
    if 'InvalidPermission.Duplicate' in error_msg:
        print("\n✅ Your IP is already in the security group!")
        print("The database connection should be working.\n")
    else:
        print(f"\n❌ Error: {error_msg}")
        print("\nTroubleshooting:")
        print("1. Check AWS credentials are correct")
        print("2. Ensure your IAM user has EC2 and RDS permissions")
        print("3. Try adding the rule manually via AWS Console\n")
        sys.exit(1)
