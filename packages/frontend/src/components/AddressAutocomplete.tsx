import { useEffect, useRef } from 'react';

interface AddressComponents {
  addressStreet1: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  addressCounty?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (addressComponents: AddressComponents) => void;
  name: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  name,
  required = false,
  placeholder = '123 Main Street',
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || typeof google === 'undefined') {
      console.warn('Google Maps not loaded');
      return;
    }

    // Initialize autocomplete with US-only results
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
      types: ['address'],
    });

    // Listen for place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place || !place.address_components) return;

      const components: AddressComponents = {
        addressStreet1: '',
        addressCity: '',
        addressState: '',
        addressZipCode: '',
        addressCounty: '',
      };

      let streetNumber = '';
      let route = '';

      // Parse address components
      for (const component of place.address_components) {
        const type = component.types[0];

        switch (type) {
          case 'street_number':
            streetNumber = component.long_name;
            break;
          case 'route':
            route = component.long_name;
            break;
          case 'locality':
            components.addressCity = component.long_name;
            break;
          case 'administrative_area_level_1':
            components.addressState = component.short_name; // e.g., "CA" instead of "California"
            break;
          case 'postal_code':
            components.addressZipCode = component.long_name;
            break;
          case 'administrative_area_level_2':
            // Remove "County" suffix if present
            components.addressCounty = component.long_name.replace(/ County$/i, '');
            break;
        }
      }

      // Combine street number and route for street address
      components.addressStreet1 = `${streetNumber} ${route}`.trim();

      // Call the callback with parsed components
      onAddressSelect(components);
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onAddressSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
