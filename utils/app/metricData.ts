import Metrics from "@/types/metrics";
// import secureLocalStorage from "react-secure-storage";
const STORAGE_KEY = process.env.NEXT_PUBLIC_METRIC_STORAGE_KEY;

export const getMetrics = (): Metrics | undefined => {
    try {
        if (STORAGE_KEY) {
            const json = localStorage.getItem(STORAGE_KEY)
            if (typeof json === 'string') {
                let savedMetrics = JSON.parse(json) as Metrics;
                return savedMetrics
            }
        }
    } catch (e) {
        // console.error(e);
        return undefined;
    }
};

export const saveMetrics = (metrics: Metrics) => {
    if (STORAGE_KEY)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
};