export default function CollapsibleFilters({
    children,
    className = "",
    bodyClassName = "",
    style,
    bodyStyle,
    title = "Filtros"
}) {
    const rootClassName = ["collapsible-filters", className].filter(Boolean).join(" ");
    const contentClassName = ["collapsible-filters__body", bodyClassName].filter(Boolean).join(" ");

    return (
        <details className={rootClassName} style={style}>
            <summary className="collapsible-filters__summary">
                <span>{title}</span>
                <span className="collapsible-filters__icon" aria-hidden="true" />
            </summary>
            <div className={contentClassName} style={bodyStyle}>
                {children}
            </div>
        </details>
    );
}
