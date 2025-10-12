# MentalSpace EHR V2 🏥

**Enterprise-Grade Electronic Health Record System for Mental Health Practices**

[![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-orange)](https://aws.amazon.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![HIPAA](https://img.shields.io/badge/HIPAA-Compliant-green)](https://www.hhs.gov/hipaa)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)

---

## 🎯 Project Overview

MentalSpace EHR V2 is a comprehensive, cloud-native electronic health record system specifically designed for mental health practices. Built with AWS services, AI integration, and HIPAA compliance at its core.

### Key Features

- 🔐 **Enterprise Authentication** - AWS Cognito with MFA
- 👥 **Client Management** - Comprehensive demographics and chart management
- 📅 **Scheduling** - Advanced appointment scheduling with recurring appointments
- 📝 **Clinical Documentation** - SOAP notes, treatment plans, intake assessments
- 🤖 **AI Integration** - Clinical note generation, billing analytics, therapist assistant
- 💰 **Billing & Claims** - AdvancedMD integration, claims management
- 👨‍⚕️ **Supervision** - Clinical supervision workflows and hour tracking
- 📹 **Telehealth** - HIPAA-compliant video sessions
- 🏥 **Client Portal** - Secure patient portal for appointments, forms, and payments
- 📊 **Reports & Analytics** - Comprehensive reporting and dashboards

---

## 📚 Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get started in 15 minutes
- **[Implementation Checklist](MentalSpaceEHR-V2-IMPLEMENTATION-CHECKLIST.md)** - Complete development roadmap
- **[Product Requirements](docs/)** - Comprehensive PRD documents
- **[API Documentation](docs/api/)** - API reference (coming soon)
- **[Architecture](docs/architecture/)** - System architecture diagrams

---

## 🏗️ Project Structure

```
mentalspace-ehr-v2/
├── infrastructure/          # AWS CDK infrastructure code
│   ├── lib/                # CDK stack definitions
│   └── bin/                # CDK app entry point
├── packages/
│   ├── backend/            # Node.js backend API
│   ├── frontend/           # React frontend application
│   ├── shared/             # Shared types and utilities
│   └── database/           # Prisma ORM and migrations
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── tests/                  # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── load/              # Load tests
└── .github/               # GitHub workflows (CI/CD)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org))
- **AWS CLI** v2 ([Install Guide](https://aws.amazon.com/cli/))
- **AWS CDK** (`npm install -g aws-cdk`)
- **Git** ([Download](https://git-scm.com/))
- **AWS Account** with administrator access

### Quick Setup

```bash
# 1. Clone the repository
cd mentalspace-ehr-v2

# 2. Install dependencies
npm run bootstrap

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Bootstrap AWS CDK (first time only)
cd infrastructure
cdk bootstrap

# 5. Deploy infrastructure
cdk deploy --all

# 6. Set up database
cd ../packages/database
npm run migrate:dev
npm run prisma:generate

# 7. Start development
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

---

## 🛠️ Technology Stack

### Infrastructure
- **Cloud:** AWS (Lambda, ECS, RDS, S3, DynamoDB, CloudFront)
- **IaC:** AWS CDK (TypeScript)
- **Auth:** AWS Cognito
- **Monitoring:** CloudWatch, X-Ray

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (RDS) + DynamoDB
- **ORM:** Prisma
- **API:** REST + GraphQL (AppSync)

### Frontend
- **Framework:** React 18+
- **Language:** TypeScript
- **UI Library:** Material-UI v5
- **Styling:** Tailwind CSS
- **State Management:** React Query + Context API
- **Routing:** React Router v6

### AI & External Services
- **AI:** OpenAI GPT-4, Anthropic Claude 3.5
- **Transcription:** AWS Transcribe Medical
- **NLP:** AWS Comprehend Medical
- **Billing:** AdvancedMD API
- **Payments:** Stripe
- **SMS:** Twilio
- **Email:** SendGrid

---

## 📦 Available Scripts

### Root Level
```bash
npm run bootstrap        # Install all dependencies
npm run build           # Build all packages
npm run test            # Run all tests
npm run lint            # Lint all code
npm run format          # Format code with Prettier
```

### Infrastructure
```bash
npm run cdk:deploy      # Deploy all stacks
npm run cdk:destroy     # Destroy all stacks
npm run cdk:diff        # Show deployment changes
```

### Backend
```bash
npm run dev:backend     # Start backend dev server
npm run build:backend   # Build backend
npm run test:backend    # Run backend tests
```

### Frontend
```bash
npm run dev:frontend    # Start frontend dev server
npm run build:frontend  # Build frontend for production
npm run test:frontend   # Run frontend tests
```

### Database
```bash
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio GUI
```

---

## 🔑 Environment Variables

Required environment variables are listed in `.env.example`. Copy this file to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Critical Variables to Set

1. **AWS Configuration** - Already configured via AWS CLI
2. **Database URLs** - Set after RDS deployment
3. **Cognito IDs** - Set after Cognito deployment
4. **API Keys** - You'll be prompted when needed:
   - OpenAI API Key (for AI clinical notes)
   - Anthropic API Key (for billing analytics)
   - Stripe Keys (for payments)
   - Twilio Credentials (for SMS)
   - SendGrid API Key (for email)

---

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Load Tests
```bash
npm run test:load
```

---

## 🚢 Deployment

### Development Environment
```bash
cd infrastructure
cdk deploy --all --context environment=dev
```

### Staging Environment
```bash
cdk deploy --all --context environment=staging
```

### Production Environment
```bash
cdk deploy --all --context environment=production --require-approval never
```

---

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ Encryption at rest (KMS)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Audit logging (CloudTrail + Application logs)
- ✅ Access controls (IAM + Cognito)
- ✅ Automatic session timeout (15 minutes)
- ✅ Data backup and recovery

### Security Best Practices
- All PHI encrypted with AWS KMS
- Secrets stored in AWS Secrets Manager
- Network isolation with VPC
- WAF rules for API protection
- Regular security audits
- Penetration testing (quarterly)

---

## 📊 Monitoring

### CloudWatch Dashboards
- API Performance
- Database Metrics
- Business Metrics
- Cost Monitoring

### Alarms
- API Error Rate > 1%
- API Latency p99 > 1000ms
- RDS CPU > 80%
- Lambda Errors
- Cost Alerts

---

## 🤝 Contributing

This is a proprietary project. For internal development:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

---

## 📝 License

**PROPRIETARY** - All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 📞 Support

For questions or issues:
- **Email:** support@mentalspaceehr.com
- **Documentation:** [docs/](docs/)
- **Issues:** Internal issue tracker

---

## 🗺️ Roadmap

### Phase 1: Foundation (4 weeks) ✅ IN PROGRESS
- [x] Project setup
- [ ] Infrastructure deployment
- [ ] Authentication system
- [ ] Basic API endpoints

### Phase 2: Core Features (8 weeks)
- [ ] Client management
- [ ] Appointment scheduling
- [ ] Clinical documentation
- [ ] Billing basics

### Phase 3: Advanced Features (8 weeks)
- [ ] AI integration
- [ ] Telehealth
- [ ] Client portal
- [ ] Advanced billing

### Phase 4: Launch Preparation (4 weeks)
- [ ] Testing & QA
- [ ] Documentation
- [ ] Training materials
- [ ] Production deployment

---

## 💻 Development Status

**Current Phase:** Phase 1 - Foundation & Setup
**Progress:** Project initialized, infrastructure setup in progress
**Next Milestone:** Deploy VPC and RDS database

---

**Built with ❤️ for mental health professionals**
