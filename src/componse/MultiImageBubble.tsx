import React from 'react';
import { Bubble } from '@chatui/core';

const MultiImageBubble = ({ images }: { images: string[] }) => {
  return (
    <Bubble type="custom">
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '4px 0'
      }}>
        {images.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`图片${index + 1}`}
            style={{
              width: 100,
              height: 100,
              objectFit: 'cover',
              borderRadius: 6,
              cursor: 'pointer'
            }}
            onClick={() => window.open(url, '_blank')}
          />
        ))}
      </div>
    </Bubble>
  );
};

export default MultiImageBubble;
