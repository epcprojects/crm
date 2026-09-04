'use client';

import debounce from 'lodash.debounce';
import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_DELAY = 300;

export function useDebouncedValue<T>(value: T, delay = DEFAULT_DEBOUNCE_DELAY) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const updateValue = debounce(setDebouncedValue, delay);

    updateValue(value);

    return () => {
      updateValue.cancel();
    };
  }, [delay, value]);

  return debouncedValue;
}
