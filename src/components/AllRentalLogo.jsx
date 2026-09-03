import React from 'react'

export default function AllRentalLogo({ src = '/images/allrental-logo.gif', alt = 'AllRental' }) {
  return (
    <div className="allRentalBrand" aria-label="AllRental">
      <img className="allRentalMark" src={src} alt={alt} draggable={false} />
    </div>
  )
}
