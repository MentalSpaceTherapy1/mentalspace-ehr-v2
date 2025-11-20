import { useState, useRef, useEffect } from 'react';

// Common CPT codes for mental health services
const COMMON_CPT_CODES = [
  // Diagnostic Evaluation
  { code: '90791', description: 'Psychiatric diagnostic evaluation' },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' },

  // Psychotherapy - Individual (Office/Outpatient/Telehealth)
  { code: '90832', description: 'Psychotherapy, 30 minutes with patient (office or telehealth)' },
  { code: '90834', description: 'Psychotherapy, 45 minutes with patient (office or telehealth)' },
  { code: '90837', description: 'Psychotherapy, 60 minutes with patient (office or telehealth)' },

  // Psychotherapy with E/M
  { code: '90833', description: 'Psychotherapy, 30 minutes with patient when performed with E/M (add-on)' },
  { code: '90836', description: 'Psychotherapy, 45 minutes with patient when performed with E/M (add-on)' },
  { code: '90838', description: 'Psychotherapy, 60 minutes with patient when performed with E/M (add-on)' },

  // Crisis Psychotherapy (Office/Outpatient/Telehealth)
  { code: '90839', description: 'Psychotherapy for crisis; first 60 minutes (office or telehealth)' },
  { code: '90840', description: 'Psychotherapy for crisis; each additional 30 minutes (add-on)' },

  // Family/Couple Psychotherapy (Office/Outpatient/Telehealth)
  { code: '90846', description: 'Family psychotherapy (without the patient present), 50 minutes (office or telehealth)' },
  { code: '90847', description: 'Family psychotherapy (conjoint psychotherapy with patient present), 50 minutes (office or telehealth)' },
  { code: '90849', description: 'Multiple-family group psychotherapy' },

  // Group Psychotherapy (Office/Outpatient/Telehealth)
  { code: '90853', description: 'Group psychotherapy (other than multiple-family group) (office or telehealth)' },

  // Interactive Complexity
  { code: '90785', description: 'Interactive complexity (add-on code for difficult communication)' },

  // Psychiatric Collaborative Care
  { code: '99492', description: 'Initial psychiatric collaborative care management, first 70 minutes' },
  { code: '99493', description: 'Subsequent psychiatric collaborative care management, first 60 minutes' },
  { code: '99494', description: 'Initial or subsequent psychiatric collaborative care management, each additional 30 minutes (add-on)' },

  // Psychological/Neuropsychological Testing
  { code: '96130', description: 'Psychological testing evaluation services, first hour' },
  { code: '96131', description: 'Psychological testing evaluation services, each additional hour (add-on)' },
  { code: '96136', description: 'Psychological or neuropsychological test administration and scoring, first 30 minutes' },
  { code: '96137', description: 'Psychological or neuropsychological test administration and scoring, each additional 30 minutes (add-on)' },
  { code: '96138', description: 'Psychological or neuropsychological test administration and scoring by technician, first 30 minutes' },
  { code: '96139', description: 'Psychological or neuropsychological test administration and scoring by technician, each additional 30 minutes (add-on)' },

  // Health Behavior Assessment/Intervention
  { code: '96156', description: 'Health behavior assessment, or re-assessment' },
  { code: '96158', description: 'Health behavior intervention, individual, face-to-face; initial 30 minutes' },
  { code: '96159', description: 'Health behavior intervention, individual, face-to-face; each additional 15 minutes (add-on)' },
  { code: '96164', description: 'Health behavior intervention, group (2 or more patients), face-to-face; initial 30 minutes' },
  { code: '96165', description: 'Health behavior intervention, group (2 or more patients), face-to-face; each additional 15 minutes (add-on)' },
  { code: '96167', description: 'Health behavior intervention, family (with the patient present), face-to-face; initial 30 minutes' },
  { code: '96168', description: 'Health behavior intervention, family (with the patient present), face-to-face; each additional 15 minutes (add-on)' },

  // Electroconvulsive Therapy
  { code: '90870', description: 'Electroconvulsive therapy (includes necessary monitoring)' },

  // Psychiatric Therapeutic Procedures
  { code: '90875', description: 'Individual psychophysiological therapy incorporating biofeedback training, 30 minutes' },
  { code: '90876', description: 'Individual psychophysiological therapy incorporating biofeedback training, 45 minutes' },

  // Pharmacologic Management
  { code: '90863', description: 'Pharmacologic management, including prescription and review of medication (add-on)' },

  // Prolonged Services
  { code: '99354', description: 'Prolonged service in the office, first hour (add-on to office visit)' },
  { code: '99355', description: 'Prolonged service in the office, each additional 30 minutes (add-on)' },
  { code: '99415', description: 'Prolonged clinical staff service during outpatient visit, first hour (add-on)' },
  { code: '99416', description: 'Prolonged clinical staff service during outpatient visit, each additional 30 minutes (add-on)' },
];

interface CPTCodeAutocompleteProps {
  value: string;
  onChange: (code: string) => void;
}

export default function CPTCodeAutocomplete({ value, onChange }: CPTCodeAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState(COMMON_CPT_CODES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm) {
      const filtered = COMMON_CPT_CODES.filter(
        item =>
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCodes(filtered);
    } else {
      setFilteredCodes(COMMON_CPT_CODES);
    }
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCode = (code: string) => {
    onChange(code);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const getCodeDescription = (code: string) => {
    const item = COMMON_CPT_CODES.find(c => c.code === code);
    return item?.description || '';
  };

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search CPT codes (e.g., 90834 or 'psychotherapy 45')"
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />

        {showDropdown && filteredCodes.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
            {filteredCodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelectCode(item.code)}
                className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="font-semibold text-purple-700">{item.code}</div>
                <div className="text-sm text-gray-600 mt-1">{item.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl">
          <div className="flex-1">
            <div className="font-semibold text-gray-800">{value}</div>
            <div className="text-sm text-gray-600 mt-1">{getCodeDescription(value)}</div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-red-500 hover:text-red-700 font-bold text-xl"
          >
            ×
          </button>
        </div>
      )}

      {!value && (
        <p className="text-sm text-gray-500 italic">No CPT code selected. Start typing to search.</p>
      )}
    </div>
  );
}
