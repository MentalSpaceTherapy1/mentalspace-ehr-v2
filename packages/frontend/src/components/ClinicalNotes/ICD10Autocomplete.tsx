import { useState, useRef, useEffect } from 'react';

// Common mental health ICD-10 codes
const COMMON_ICD10_CODES = [
  // Anxiety Disorders
  { code: 'F41.0', description: 'Panic disorder [episodic paroxysmal anxiety]' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'F41.8', description: 'Other specified anxiety disorders' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified' },

  // Depressive Disorders
  { code: 'F32.0', description: 'Major depressive disorder, single episode, mild' },
  { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate' },
  { code: 'F32.2', description: 'Major depressive disorder, single episode, severe' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  { code: 'F33.0', description: 'Major depressive disorder, recurrent, mild' },
  { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' },
  { code: 'F33.2', description: 'Major depressive disorder, recurrent, severe' },
  { code: 'F33.9', description: 'Major depressive disorder, recurrent, unspecified' },
  { code: 'F34.1', description: 'Persistent depressive disorder (dysthymia)' },

  // Bipolar Disorders
  { code: 'F31.0', description: 'Bipolar disorder, current episode hypomanic' },
  { code: 'F31.10', description: 'Bipolar disorder, current episode manic without psychotic features, unspecified' },
  { code: 'F31.11', description: 'Bipolar disorder, current episode manic without psychotic features, mild' },
  { code: 'F31.12', description: 'Bipolar disorder, current episode manic without psychotic features, moderate' },
  { code: 'F31.13', description: 'Bipolar disorder, current episode manic without psychotic features, severe' },
  { code: 'F31.2', description: 'Bipolar disorder, current episode manic with psychotic features' },
  { code: 'F31.30', description: 'Bipolar disorder, current episode depressed, mild or moderate severity, unspecified' },
  { code: 'F31.31', description: 'Bipolar disorder, current episode depressed, mild' },
  { code: 'F31.32', description: 'Bipolar disorder, current episode depressed, moderate' },
  { code: 'F31.4', description: 'Bipolar disorder, current episode depressed, severe' },
  { code: 'F31.9', description: 'Bipolar disorder, unspecified' },

  // PTSD and Trauma
  { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified' },
  { code: 'F43.11', description: 'Post-traumatic stress disorder, acute' },
  { code: 'F43.12', description: 'Post-traumatic stress disorder, chronic' },
  { code: 'F43.0', description: 'Acute stress reaction' },
  { code: 'F43.21', description: 'Adjustment disorder with depressed mood' },
  { code: 'F43.22', description: 'Adjustment disorder with anxiety' },
  { code: 'F43.23', description: 'Adjustment disorder with mixed anxiety and depressed mood' },
  { code: 'F43.24', description: 'Adjustment disorder with disturbance of conduct' },
  { code: 'F43.25', description: 'Adjustment disorder with mixed disturbance of emotions and conduct' },

  // OCD and Related
  { code: 'F42.2', description: 'Obsessive-compulsive disorder, primarily obsessive' },
  { code: 'F42.3', description: 'Obsessive-compulsive disorder, primarily compulsive' },
  { code: 'F42.4', description: 'Excoriation (skin-picking) disorder' },
  { code: 'F42.8', description: 'Other obsessive-compulsive disorder' },
  { code: 'F42.9', description: 'Obsessive-compulsive disorder, unspecified' },

  // Substance Use Disorders
  { code: 'F10.10', description: 'Alcohol abuse, uncomplicated' },
  { code: 'F10.20', description: 'Alcohol dependence, uncomplicated' },
  { code: 'F11.10', description: 'Opioid abuse, uncomplicated' },
  { code: 'F11.20', description: 'Opioid dependence, uncomplicated' },
  { code: 'F12.10', description: 'Cannabis abuse, uncomplicated' },
  { code: 'F12.20', description: 'Cannabis dependence, uncomplicated' },
  { code: 'F14.10', description: 'Cocaine abuse, uncomplicated' },
  { code: 'F14.20', description: 'Cocaine dependence, uncomplicated' },
  { code: 'F15.10', description: 'Other stimulant abuse, uncomplicated' },
  { code: 'F15.20', description: 'Other stimulant dependence, uncomplicated' },

  // ADHD
  { code: 'F90.0', description: 'Attention-deficit hyperactivity disorder, predominantly inattentive type' },
  { code: 'F90.1', description: 'Attention-deficit hyperactivity disorder, predominantly hyperactive type' },
  { code: 'F90.2', description: 'Attention-deficit hyperactivity disorder, combined type' },
  { code: 'F90.9', description: 'Attention-deficit hyperactivity disorder, unspecified type' },

  // Personality Disorders
  { code: 'F60.0', description: 'Paranoid personality disorder' },
  { code: 'F60.1', description: 'Schizoid personality disorder' },
  { code: 'F60.2', description: 'Antisocial personality disorder' },
  { code: 'F60.3', description: 'Borderline personality disorder' },
  { code: 'F60.4', description: 'Histrionic personality disorder' },
  { code: 'F60.5', description: 'Obsessive-compulsive personality disorder' },
  { code: 'F60.6', description: 'Avoidant personality disorder' },
  { code: 'F60.7', description: 'Dependent personality disorder' },
  { code: 'F60.9', description: 'Personality disorder, unspecified' },

  // Schizophrenia
  { code: 'F20.0', description: 'Paranoid schizophrenia' },
  { code: 'F20.9', description: 'Schizophrenia, unspecified' },
  { code: 'F25.0', description: 'Schizoaffective disorder, bipolar type' },
  { code: 'F25.1', description: 'Schizoaffective disorder, depressive type' },
  { code: 'F25.9', description: 'Schizoaffective disorder, unspecified' },

  // Eating Disorders
  { code: 'F50.00', description: 'Anorexia nervosa, unspecified' },
  { code: 'F50.01', description: 'Anorexia nervosa, restricting type' },
  { code: 'F50.02', description: 'Anorexia nervosa, binge eating/purging type' },
  { code: 'F50.2', description: 'Bulimia nervosa' },
  { code: 'F50.81', description: 'Binge eating disorder' },
  { code: 'F50.89', description: 'Other specified eating disorder' },

  // Sleep Disorders
  { code: 'F51.01', description: 'Primary insomnia' },
  { code: 'F51.11', description: 'Primary hypersomnia' },
  { code: 'F51.5', description: 'Nightmare disorder' },

  // Other Common
  { code: 'Z63.0', description: 'Problems in relationship with spouse or partner' },
  { code: 'Z63.5', description: 'Disruption of family by separation or divorce' },
  { code: 'Z65.0', description: 'Conviction in civil and criminal proceedings without imprisonment' },
  { code: 'Z65.4', description: 'Victim of crime and terrorism' },
  { code: 'R45.851', description: 'Suicidal ideations' },
];

interface ICD10AutocompleteProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  disabled?: boolean;
}

export default function ICD10Autocomplete({ selectedCodes, onCodesChange, disabled }: ICD10AutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCodes, setFilteredCodes] = useState(COMMON_ICD10_CODES);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm) {
      const filtered = COMMON_ICD10_CODES.filter(
        item =>
          item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCodes(filtered);
    } else {
      setFilteredCodes(COMMON_ICD10_CODES);
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

  const handleAddCode = (code: string) => {
    if (!selectedCodes.includes(code)) {
      onCodesChange([...selectedCodes, code]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleRemoveCode = (code: string) => {
    onCodesChange(selectedCodes.filter(c => c !== code));
  };

  const getCodeDescription = (code: string) => {
    const item = COMMON_ICD10_CODES.find(c => c.code === code);
    return item?.description || code;
  };

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          disabled={disabled}
          placeholder="Search ICD-10 codes (e.g., F41.1 or 'anxiety')"
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {showDropdown && filteredCodes.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
            {filteredCodes.slice(0, 50).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleAddCode(item.code)}
                disabled={selectedCodes.includes(item.code)}
                className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  selectedCodes.includes(item.code) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                <div className="font-semibold text-purple-700">{item.code}</div>
                <div className="text-sm text-gray-600 mt-1">{item.description}</div>
              </button>
            ))}
            {filteredCodes.length > 50 && (
              <div className="px-4 py-2 text-sm text-gray-500 text-center bg-gray-50">
                Showing first 50 results. Narrow your search for more specific codes.
              </div>
            )}
          </div>
        )}
      </div>

      {disabled && (
        <p className="text-xs text-gray-500 italic">
          Note: Diagnosis codes can only be modified in Intake Assessment and Treatment Plan notes
        </p>
      )}

      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((code) => (
            <div
              key={code}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg group"
            >
              <div>
                <div className="font-semibold text-gray-800">{code}</div>
                <div className="text-xs text-gray-600">{getCodeDescription(code)}</div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveCode(code)}
                  className="text-red-500 hover:text-red-700 font-bold text-lg ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCodes.length === 0 && !disabled && (
        <p className="text-sm text-gray-500 italic">No diagnosis codes selected. Start typing to search.</p>
      )}
    </div>
  );
}
