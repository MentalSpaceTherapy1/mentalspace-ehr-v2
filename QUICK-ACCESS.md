# MentalSpace EHR - Quick Access Guide

## Backend API (LIVE)
```
http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com
```

## Health Check Endpoints
- **Liveness:** http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com/api/v1/health/live
- **Readiness:** http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com/api/v1/health/ready

## Quick Commands

### View Live Logs
```bash
aws logs tail /ecs/mentalspace-ehr-dev --follow --region us-east-1
```

### Check Service Status
```bash
aws ecs describe-services --cluster mentalspace-ehr-dev --services mentalspace-backend-dev --region us-east-1 --query 'services[0].[deployments[0].rolloutState,runningCount,desiredCount]' --output table
```

### Redeploy Backend
```bash
./deploy.sh
```

### Test API
```bash
curl http://mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com/api/v1/health/live
```

## AWS Console Links
- **ECS Service:** https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/mentalspace-ehr-dev/services/mentalspace-backend-dev
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Fecs$252Fmentalspace-ehr-dev

## Next Steps
1. Deploy frontend to AWS Amplify or S3
2. Run database migrations on AWS RDS
3. Configure CORS for frontend domain
4. Set up custom domain (optional)

## Documentation
- [DEPLOYMENT-SUCCESS-SUMMARY.md](DEPLOYMENT-SUCCESS-SUMMARY.md) - Full deployment details
- [AWS-DEPLOYMENT-GUIDE.md](AWS-DEPLOYMENT-GUIDE.md) - Deployment guide
- [SESSION-COMPLETION-SUMMARY.md](SESSION-COMPLETION-SUMMARY.md) - Session summary
