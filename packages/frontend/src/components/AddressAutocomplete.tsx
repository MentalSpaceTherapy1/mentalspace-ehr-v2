import { useEffect, useRef, useState } from 'react';

/**
 * TODO: GOOGLE MAPS API MIGRATION REQUIRED (Deadline: February 2026)
 *
 * As of February 2024, google.maps.places.Autocomplete is deprecated.
 * This component needs to be migrated to use PlaceAutocompleteElement instead.
 *
 * Migration guide: https://developers.google.com/maps/documentation/javascript/place-autocomplete-migration
 *
 * Key changes required:
 * 1. Replace `new google.maps.places.Autocomplete()` with `new google.maps.places.PlaceAutocompleteElement()`
 * 2. The new API uses a Custom Element (Web Component) approach
 * 3. Event handling changes from 'place_changed' to 'gmp-placeselect'
 * 4. Options structure and field names have changed
 *
 * Current implementation works but should be migrated before February 2026.
 */

interface AddressComponents {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({
  onAddressSelect,
  value,
  onChange,
  placeholder = 'Start typing your address...',
  className = '',
  required = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Wait for Google Maps to load
  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsGoogleMapsLoaded(true);
    } else {
      const handleLoad = () => {
        setIsGoogleMapsLoaded(true);
      };
      window.addEventListener('google-maps-loaded', handleLoad);
      return () => window.removeEventListener('google-maps-loaded', handleLoad);
    }
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    // Initialize Google Places Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'name']
    });

    autocompleteRef.current = autocomplete;

    // Listen for place selection
    google.maps.event.addListener(autocompleteRef.current, 'place_changed', () => {
      const place = autocompleteRef.current?.getPlace();

      if (!place || !place.address_components) {
        return;
      }

      // Parse address components
      const addressComponents: AddressComponents = {
        street1: '',
        city: '',
        state: '',
        zipCode: ''
      };

      let streetNumber = '';
      let route = '';

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          route = component.long_name;
        }
        if (types.includes('locality')) {
          addressComponents.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          addressComponents.state = component.short_name;
        }
        if (types.includes('postal_code')) {
          addressComponents.zipCode = component.long_name;
        }
        if (types.includes('administrative_area_level_2')) {
          // County (e.g., "Fulton County")
          addressComponents.county = component.long_name.replace(' County', '');
        }
      });

      // Combine street number and route
      addressComponents.street1 = `${streetNumber} ${route}`.trim();

      // Call the callback with parsed components
      onAddressSelect(addressComponents);

      // Update the input value with only the street address
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.value = addressComponents.street1;
          onChange(addressComponents.street1);
        }
      });
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleMapsLoaded, onAddressSelect, onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />
      {!isGoogleMapsLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}
