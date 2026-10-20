import { ChevronRight } from 'lucide-react'
import type { Museum } from '../types/museum'

type MuseumResultsProps = {
  museums: Museum[]
  visibleCount: number
  selectedMuseumId: string | null
  onSelect: (museumId: string) => void
}

const MuseumResults = ({
  museums,
  visibleCount,
  selectedMuseumId,
  onSelect,
}: MuseumResultsProps) => (
  <ul className="museum-results" aria-label="Museums">
    {museums.map((museum, index) => {
      const isSelected = museum.id === selectedMuseumId
      const isOpen = index < visibleCount || isSelected

      return (
        <li key={museum.id} data-open={isOpen || undefined} inert={!isOpen}>
          <div className="museum-results__clip">
            <button
              type="button"
              className="museum-results__option"
              aria-pressed={isSelected}
              onClick={() => onSelect(museum.id)}
            >
              <span className="museum-results__text">
                <span className="museum-results__name">{museum.name}</span>
                {museum.location && (
                  <span className="museum-results__location">
                    {museum.location}
                  </span>
                )}
              </span>
              {!isSelected && (
                <ChevronRight
                  className="museum-results__chevron"
                  size={18}
                  strokeWidth={1.8}
                />
              )}
            </button>
          </div>
        </li>
      )
    })}
  </ul>
)

export default MuseumResults
