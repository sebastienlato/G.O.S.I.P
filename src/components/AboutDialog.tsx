import { forwardRef } from 'react'
import { X } from 'lucide-react'
import PrivacySources from './PrivacySources'

/** About GOSIP, or only privacy and licences when `privacyOnly`. */
const AboutDialog = forwardRef<HTMLDialogElement, { privacyOnly: boolean }>(
  function AboutDialog({ privacyOnly }, ref) {
    const close = () =>
      (ref as React.RefObject<HTMLDialogElement | null>).current?.close()
    return (
      <dialog
        ref={ref}
        className="about-dialog"
        aria-labelledby="about-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        <div className="detail-content">
          <div className="dialog-top">
            <span className="dialog-kicker">Open to everyone</span>
            <button
              autoFocus
              className="icon-button"
              aria-label="Close about"
              onClick={close}
            >
              <X size={20} />
            </button>
          </div>
          {privacyOnly ? (
            <h2 id="about-title">Privacy & sources</h2>
          ) : (
            <>
              <h2 id="about-title">What GOSIP shows</h2>
              <p>
                GOSIP combines earthquakes, curated hazards, German weather
                warnings, global thermal summaries, attributed report headlines
                delayed OONI measurement totals, launch schedules and delayed
                maritime estimates from public snapshots checked on a
                best-effort 15-minute schedule. Each layer keeps its own source,
                times and freshness. The separate simulation lab holds invented
                examples and never mixes them with live data.
              </p>
              <h3>Read it with care</h3>
              <p>
                Locations and magnitudes are provider estimates that can change.
                Provider review does not verify impacts. An empty region does
                not mean nothing is happening there. Demo time in the lab is
                fixed at 8 October 2026, 16:00 UTC; live filters use your device
                clock.
              </p>
            </>
          )}
          <PrivacySources />
        </div>
      </dialog>
    )
  },
)
export default AboutDialog
