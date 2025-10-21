import { useEffect, useRef, useState } from 'react';

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
    console.log('🔵 AddressAutocomplete mounted, window.googleMapsLoaded:', window.googleMapsLoaded);
    if (window.googleMapsLoaded) {
      console.log('🔵 Google Maps already loaded');
      setIsGoogleMapsLoaded(true);
    } else {
      console.log('🔵 Waiting for google-maps-loaded event');
      const handleLoad = () => {
        console.log('🔵 google-maps-loaded event received');
        setIsGoogleMapsLoaded(true);
      };
      window.addEventListener('google-maps-loaded', handleLoad);
      return () => window.removeEventListener('google-maps-loaded', handleLoad);
    }
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    console.log('🟢 Initialize autocomplete effect, isGoogleMapsLoaded:', isGoogleMapsLoaded, 'inputRef.current:', !!inputRef.current, 'autocompleteRef.current:', !!autocompleteRef.current);

    if (!isGoogleMapsLoaded || !inputRef.current || autocompleteRef.current) {
      console.log('🟢 Skipping initialization');
      return;
    }

    console.log('🟢 Initializing Google Places Autocomplete');
    console.log('🟢 google.maps.places available:', !!google?.maps?.places);

    // Initialize Google Places Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'name']
    });

    console.log('🟢 Autocomplete created:', autocomplete);
    autocompleteRef.current = autocomplete;

    // Listen for place selection using modern event API
    google.maps.event.addListener(autocompleteRef.current, 'place_changed', () => {
      console.log('🔥 PLACE_CHANGED EVENT FIRED');
      const place = autocompleteRef.current?.getPlace();
      console.log('🔥 PLACE:', place);

      if (!place || !place.address_components) {
        console.log('🔥 NO PLACE OR ADDRESS COMPONENTS');
        return;
      }

      console.log('🔥 ADDRESS COMPONENTS:', place.address_components);

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

      console.log('🔥 PARSED ADDRESS:', addressComponents);

      // Immediately call the callback with parsed components
      onAddressSelect(addressComponents);

      console.log('🔥 CALLED onAddressSelect');

      // Update the input value with ONLY the street address (not the full formatted address)
      // Use requestAnimationFrame to ensure it happens after Google's autocomplete
      requestAnimationFrame(() => {
        if (inputRef.current) {
          console.log('🔥 SETTING INPUT VALUE TO:', addressComponents.street1);
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
