"use client";

/**
 * Custom Cluster Renderer
 * 
 * Zgodny z audytem UX/UI:
 * - Gradient Airbnb-style (#ff5a5f → #ff385c)
 * - Box-shadow (Material Design elevation)
 * - Mikro-interakcje (hover scale)
 * - Opcjonalnie: średnia cena w klastrze
 */

import { Cluster, ClusterStats, Renderer } from "@googlemaps/markerclusterer";

// Interfejs dla danych markera z ceną
interface MarkerWithPrice extends google.maps.marker.AdvancedMarkerElement {
    price?: number;
}

/**
 * Tworzy element DOM dla klastra
 */
function createClusterElement(count: number, avgPrice?: number): HTMLDivElement {
    const div = document.createElement('div');

    // Rozmiar dynamiczny na podstawie liczby elementów
    const size = Math.min(60, 36 + Math.log2(count) * 6);

    div.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff5a5f 0%, #ff385c 100%);
        box-shadow: 0 4px 12px rgba(255, 90, 95, 0.4), 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: 2px solid rgba(255,255,255,0.3);
        font-family: system-ui, -apple-system, sans-serif;
    `;

    // Liczba ofert
    const countSpan = document.createElement('span');
    countSpan.textContent = count.toString();
    countSpan.style.cssText = `
        color: white;
        font-weight: 700;
        font-size: ${size > 45 ? '14px' : '12px'};
        line-height: 1;
    `;
    div.appendChild(countSpan);

    // Średnia cena (jeśli dostępna)
    if (avgPrice !== undefined && avgPrice > 0) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${Math.round(avgPrice)} zł`;
        priceSpan.style.cssText = `
            color: rgba(255,255,255,0.85);
            font-size: 9px;
            font-weight: 500;
            margin-top: 1px;
        `;
        div.appendChild(priceSpan);
    }

    // Hover effects
    div.addEventListener('mouseenter', () => {
        div.style.transform = 'scale(1.15)';
        div.style.boxShadow = '0 6px 20px rgba(255, 90, 95, 0.5), 0 4px 8px rgba(0,0,0,0.3)';
    });

    div.addEventListener('mouseleave', () => {
        div.style.transform = 'scale(1)';
        div.style.boxShadow = '0 4px 12px rgba(255, 90, 95, 0.4), 0 2px 4px rgba(0,0,0,0.2)';
    });

    return div;
}

/**
 * Oblicza średnią cenę z markerów w klastrze
 */
function calculateAveragePrice(markers: google.maps.marker.AdvancedMarkerElement[]): number | undefined {
    const prices = markers
        .map(m => (m as MarkerWithPrice).price)
        .filter((p): p is number => typeof p === 'number' && p > 0);

    if (prices.length === 0) return undefined;
    return prices.reduce((sum, p) => sum + p, 0) / prices.length;
}

/**
 * Custom Renderer dla MarkerClusterer
 * Zgodny z interfejsem Renderer z @googlemaps/markerclusterer
 */
export const clusterRenderer: Renderer = {
    render: (cluster: Cluster, _stats: ClusterStats, map: google.maps.Map) => {
        const { count, position, markers } = cluster;

        // Oblicz średnią cenę (opcjonalnie)
        const avgPrice = markers ? calculateAveragePrice(markers as google.maps.marker.AdvancedMarkerElement[]) : undefined;

        // Stwórz element DOM
        const content = createClusterElement(count, avgPrice);

        // Użyj AdvancedMarkerElement
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position,
            content,
            map,
            zIndex: 1000 + count, // Większe klastry na wierzchu
        });

        // Click handler - zoom to bounds
        marker.addListener('click', () => {
            if (cluster.bounds) {
                map.fitBounds(cluster.bounds, {
                    top: 50,
                    right: 50,
                    bottom: 50,
                    left: 50
                });
            }
        });

        return marker;
    }
};

/**
 * Eksport funkcji pomocniczej do tworzenia opcji clusterera
 */
export function getClusterOptions() {
    return {
        renderer: clusterRenderer,
        // Algorytm domyślny jest OK, ale można dostosować:
        // algorithm: new SuperClusterAlgorithm({ radius: 60 }),
    };
}
