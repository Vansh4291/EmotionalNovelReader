/**
 * Browser shim for @react-native-community/slider (validation harness only).
 */
import React from 'react';

const Slider = React.forwardRef(function Slider(
  { value = 0, minimumValue = 0, maximumValue = 1, step = 0.01, onValueChange, style, ...rest }, ref
) {
  const pct = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  return (
    <div ref={ref} style={{ position: 'relative', ...style, height: style?.height || 40 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, transform: 'translateY(-50%)', borderRadius: 2, background: (rest.maximumTrackTintColor || '#ccc') }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, width: `${pct}%`, height: 4, transform: 'translateY(-50%)', borderRadius: 2, background: rest.minimumTrackTintColor || '#4a90d9' }} />
      <div data-thumb style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 20, height: 20, borderRadius: 10, transform: 'translate(-50%, -50%)', background: rest.thumbTintColor || '#4a90d9', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
      <input
        type="range"
        aria-label={rest.accessibilityLabel}
        min={minimumValue}
        max={maximumValue}
        step={step}
        value={value}
        onChange={(e) => onValueChange && onValueChange(parseFloat(e.target.value))}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
      />
    </div>
  );
});

export default Slider;
