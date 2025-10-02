import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

interface IconProps {
    icon: IconDefinition
}

export function Icon({icon}: IconProps) {
  return (
    <FontAwesomeIcon icon={icon}/>
  )
}