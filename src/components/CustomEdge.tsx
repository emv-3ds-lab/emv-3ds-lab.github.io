import React from 'react';
import { getStraightPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface CustomEdgeData {
  color: string;
  isCurrent: boolean;
  stepNum: string;
  msgType?: string;
  fieldsPreview?: string[];
}

export const CustomMessageEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const edgeData = data as unknown as CustomEdgeData | undefined;
  const isCurrent = edgeData?.isCurrent || false;
  const strokeColor = edgeData?.color || 'var(--accent-primary)';

  // True when the target sits to the right of the source, so we can
  // choose the right directional icon (→ vs ←) for the label. This makes
  // the flow direction readable even when the arrow head is small or the
  // edge is far from the user's current focus.
  const flowsRight = targetX >= sourceX;
  const DirectionIcon = flowsRight ? ArrowRight : ArrowLeft;

  // Distance to travel along the edge. The sign of travelDistance
  // automatically encodes direction (negative = target is to the left).
  const travelDistance = targetX - sourceX;
  const travelDuration = Math.min(2.6, Math.max(1.4, Math.abs(travelDistance) / 280));

  // The data "packet" we animate along the edge.
  // Use the message type as the primary chip label so the user can read
  // what data is in flight (not just see a color change).
  const packetLabel =
    edgeData?.msgType || (typeof label === 'string' ? label.split(' ')[0] : '') || 'DATA';
  const packetField = edgeData?.fieldsPreview && edgeData.fieldsPreview[0];

  return (
    <>
      {/* Main message arrow */}
      <path
        id={id}
        className={`react-flow__edge-path ${isCurrent ? 'active-message-edge' : ''}`}
        d={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: isCurrent ? 2.5 : 1.5,
          transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s',
        }}
        markerEnd={markerEnd}
      />

      {/* Flying data packet — appears only while the edge is the current step.
          It travels from source to target so the user can see *what* data is
          in flight, not just a color change. */}
      {isCurrent && (
        <EdgeLabelRenderer>
          <div
            className="data-packet"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${sourceX}px, ${sourceY}px)`,
              pointerEvents: 'none',
              zIndex: 1001,
            }}
          >
            <div
              className="data-packet-chip"
              style={{
                '--travel-distance': `${travelDistance}px`,
                '--travel-duration': `${travelDuration}s`,
                '--packet-color': strokeColor,
              } as React.CSSProperties}
              title={packetField ? `${packetLabel}: ${packetField}` : packetLabel}
            >
              <span className="data-packet-dot" />
              <span className="data-packet-type">{packetLabel}</span>
              {packetField && (
                <span className="data-packet-field">· {packetField}</span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Custom HTML Label rendered above the edge */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
          >
            <div
              className={`react-flow__edge-label-box ${isCurrent ? 'current' : ''}`}
              style={{
                background: 'var(--bg-secondary)',
                border: `1.5px solid ${isCurrent ? strokeColor : 'var(--border-color)'}`,
                color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '10.5px',
                fontWeight: '700',
                boxShadow: isCurrent
                  ? `0 4px 12px ${strokeColor}25, 0 1px 3px rgba(0,0,0,0.1)`
                  : 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {edgeData?.msgType && (
                  <span style={{
                    background: `${strokeColor}18`,
                    color: strokeColor,
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: '800',
                    border: `1px solid ${strokeColor}25`
                  }}>
                    {edgeData.msgType}
                  </span>
                )}
                <span>{label}</span>
                {/* Direction indicator. Pinned on the target side of the
                    label so the user can read at a glance which way data
                    is flowing, even on huge diagrams. */}
                <DirectionIcon
                  size={12}
                  strokeWidth={2.8}
                  style={{
                    color: isCurrent ? strokeColor : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                  aria-label={flowsRight ? 'flows right' : 'flows left'}
                />
              </div>

              {edgeData?.fieldsPreview && edgeData.fieldsPreview.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '3px',
                  justifyContent: 'center',
                  marginTop: '3px',
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '3.5px',
                  width: '100%'
                }}>
                  {edgeData.fieldsPreview.map((f: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '8px',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-primary)',
                        padding: '1px 3px',
                        borderRadius: '2px',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'JetBrains Mono',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
