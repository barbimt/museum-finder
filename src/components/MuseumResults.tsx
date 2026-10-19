import type { Museum } from '../types/museum'

type MuseumResultsProps = {
  museums: Museum[]
  selectedMuseumId: string | null
  onSelect: (museumId: string) => void
}

const MuseumResults = ({
  museums,
  selectedMuseumId,
  onSelect,
}: MuseumResultsProps) => (
  <ul className="museum-results" aria-label="Museums">
    {museums.map((museum) => (
      <li key={museum.id}>
        <button
          type="button"
          className="museum-results__option"
          aria-pressed={museum.id === selectedMuseumId}
          onClick={() => onSelect(museum.id)}
        >
          <span className="museum-results__name">{museum.name}</span>
          {museum.location && (
            <span className="museum-results__location">{museum.location}</span>
          )}
        </button>
      </li>
    ))}
  </ul>
)

export default MuseumResults
