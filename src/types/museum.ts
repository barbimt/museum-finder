export type Coordinates = {
  latitude: number
  longitude: number
}

export type MuseumAddress = {
  street: string
  summary?: string
}

export type Museum = {
  id: string
  name: string
  location: string
  address?: MuseumAddress
  coordinates?: Coordinates
}
