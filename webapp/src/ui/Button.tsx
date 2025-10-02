import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "./Icon";

export interface ButtonProps {
    size: 'xs' | 'sm' | 'md' | 'lg',
    icon: IconDefinition,
}


export function Button({ size, icon }: ButtonProps) {
    return(
        <button className={`btn-${size}`}>
            <Icon icon={icon} />
        </button>
    )
}