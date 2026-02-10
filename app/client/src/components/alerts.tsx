import { useAlerts } from '@dhis2/app-service-alerts'
import type { Alert, AlertOptions } from '@dhis2/app-service-alerts/build/types/types'
import { AlertBar, AlertStack } from '@dhis2/ui'
import { useState, useEffect } from 'react'
import type { FC } from 'react'

interface AlertStackOptions extends AlertOptions {
    onHidden?: () => void
}

interface AlertStackAlert extends Alert {
    options: AlertStackOptions
}

/* This was simply copied from @dhis2/app-adapter,
 * we need to move it to @dhis2/ui and import it from
 * there, although we did have to add types here */

const Alerts: FC = () => {
    const alertManagerAlerts = useAlerts()
    const [alertStackAlerts, setAlertStackAlerts] = useState<AlertStackAlert[]>(alertManagerAlerts)
    const removeAlertStackAlert = (id) => setAlertStackAlerts((prev) => prev.filter((alertStackAlert) => alertStackAlert.id !== id))

    useEffect(() => {
        if (alertManagerAlerts.length > 0) {
            setAlertStackAlerts((currentAlertStackAlerts): AlertStackAlert[] => mergeAlertStackAlerts(currentAlertStackAlerts, alertManagerAlerts))
        }
    }, [alertManagerAlerts])

    return (
        <AlertStack>
            {alertStackAlerts.map(({ message, remove, id, options: { onHidden, ...props } }) => (
                <AlertBar
                    {...props}
                    key={id}
                    onHidden={() => {
                        onHidden && onHidden()
                        removeAlertStackAlert(id)
                        if (alertManagerAlerts.some((a) => a.id === id)) {
                            remove()
                        }
                    }}
                >
                    {message}
                </AlertBar>
            ))}
        </AlertStack>
    )
}

const mergeAlertStackAlerts = (alertStackAlerts, alertManagerAlerts): AlertStackAlert[] => {
    return Object.values({
        /*
         * Assume that all alerts in the alertStackAlerts array are hiding.
         * After the object merge only the alerts not in the alertManagerAlerts
         * array will have `options.hidden === true`.
         */
        ...toIdBasedObjectWithHiddenOption(alertStackAlerts, true),
        /*
         * All alertManagerAlerts should be showing. This object merge will
         * overwrite any alertStackAlert by the alertManagerAlert with
         * the same `id`, thus ensuring the alert is visible.
         */
        ...toIdBasedObjectWithHiddenOption(alertManagerAlerts, false),
    })
}

const toIdBasedObjectWithHiddenOption = (arr, hidden) => {
    return arr.reduce((obj, item) => {
        obj[item.id] = {
            ...item,
            options: {
                ...item.options,
                hidden,
            },
        }
        return obj
    }, {})
}

export { Alerts }
