import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  width: string;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 12 characters',
    test: (pwd) => pwd.length >= 12
  },
  {
    label: 'Contains uppercase letter (A-Z)',
    test: (pwd) => /[A-Z]/.test(pwd)
  },
  {
    label: 'Contains lowercase letter (a-z)',
    test: (pwd) => /[a-z]/.test(pwd)
  },
  {
    label: 'Contains number (0-9)',
    test: (pwd) => /[0-9]/.test(pwd)
  },
  {
    label: 'Contains special character (!@#$%^&*)',
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  }
];

const strengthConfig: Record<StrengthLevel, StrengthConfig> = {
  weak: {
    label: 'Weak',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    width: 'w-1/4'
  },
  fair: {
    label: 'Fair',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    width: 'w-2/4'
  },
  good: {
    label: 'Good',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    width: 'w-3/4'
  },
  strong: {
    label: 'Strong',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    width: 'w-full'
  }
};

export default function PasswordStrengthIndicator({
  password,
  showRequirements = true
}: PasswordStrengthIndicatorProps) {
  const analysis = useMemo(() => {
    if (!password) {
      return {
        strength: 'weak' as StrengthLevel,
        metRequirements: [],
        score: 0,
        feedback: 'Enter a password to see strength'
      };
    }

    const metRequirements = requirements.filter(req => req.test(password));
    const score = metRequirements.length;

    let strength: StrengthLevel;
    let feedback: string;

    if (score <= 1) {
      strength = 'weak';
      feedback = 'Your password is too weak. Add more character types.';
    } else if (score === 2 || score === 3) {
      strength = 'fair';
      feedback = 'Your password is fair, but could be stronger.';
    } else if (score === 4) {
      strength = 'good';
      feedback = 'Your password is good! Consider adding more character types.';
    } else {
      strength = 'strong';
      feedback = 'Excellent! Your password is strong and secure.';
    }

    return { strength, metRequirements, score, feedback };
  }, [password]);

  const config = strengthConfig[analysis.strength];

  return (
    <div className="space-y-4">
      {/* Strength Meter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Password Strength
          </span>
          <span className={`text-sm font-semibold ${config.textColor}`}>
            {config.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-300 ease-out ${config.width}`}
          />
        </div>

        {/* Feedback Message */}
        {password && (
          <div className={`mt-2 p-3 rounded-lg ${config.bgColor}`}>
            <p className={`text-sm ${config.textColor}`}>
              {analysis.feedback}
            </p>
          </div>
        )}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Password Requirements:
          </p>
          <div className="space-y-2">
            {requirements.map((requirement, index) => {
              const isMet = analysis.metRequirements.includes(requirement);
              return (
                <div
                  key={index}
                  className={`flex items-start space-x-2 transition-all duration-200 ${
                    isMet ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {isMet ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${
                      isMet ? 'text-green-700 font-medium' : 'text-gray-600'
                    }`}
                  >
                    {requirement.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score Indicator */}
      <div className="flex items-center justify-center space-x-1 pt-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 w-8 rounded-full transition-all duration-300 ${
              level <= analysis.score
                ? config.color
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Export helper function to check if password meets all requirements
export function isPasswordStrong(password: string): boolean {
  return requirements.every(req => req.test(password));
}

// Export helper function to get failed requirements
export function getFailedRequirements(password: string): string[] {
  return requirements
    .filter(req => !req.test(password))
    .map(req => req.label);
}
