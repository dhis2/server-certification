import { AlertsProvider } from '@dhis2/app-service-alerts'
import { CssReset, CssVariables } from '@dhis2/ui'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/400-italic.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'
import { AdminRoute, Alerts, AuthProvider, ErrorBoundary, ErrorView, Layout } from '../components/index.ts'
import {
    Dashboard,
    Settings,
    NotFound,
    ImplementationsList,
    ImplementationDetails,
    AssessmentsList,
    CreateAssessment,
    AssessmentForm,
    AssessmentSummary,
    CertificateResult,
    VerifyCertificate,
    TemplatesList,
    TemplateDetail,
    TemplateImport,
    TemplateDiff,
    UsersList,
    UserDetail,
    CertificatesList,
    CertificateDetail,
    MonitoringDashboard,
    AuditLogs,
    AuditLogDetail,
    SigningKeys,
} from '../views/index.ts'

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route>
            <Route path="/verify/:code" element={<VerifyCertificate />} />

            <Route element={<AuthProvider />}>
                <Route errorElement={<ErrorView />} element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/implementations" element={<ImplementationsList />} />
                    <Route path="/implementations/:id" element={<ImplementationDetails />} />

                    <Route path="/assessments" element={<AssessmentsList />} />
                    <Route path="/assessments/new" element={<CreateAssessment />} />
                    <Route path="/assessments/:id" element={<AssessmentForm />} />
                    <Route path="/assessments/:id/summary" element={<AssessmentSummary />} />
                    <Route path="/assessments/:id/certificate" element={<CertificateResult />} />

                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/security" element={<Navigate to="/settings?tab=security" replace />} />

                    <Route element={<AdminRoute />}>
                        <Route path="/templates" element={<TemplatesList />} />
                        <Route path="/templates/import" element={<TemplateImport />} />
                        <Route path="/templates/diff/:name" element={<TemplateDiff />} />
                        <Route path="/templates/:id" element={<TemplateDetail />} />
                        <Route path="/admin/users" element={<UsersList />} />
                        <Route path="/admin/users/:id" element={<UserDetail />} />
                        <Route path="/admin/certificates" element={<CertificatesList />} />
                        <Route path="/admin/certificates/:id" element={<CertificateDetail />} />
                        <Route path="/admin/monitoring" element={<MonitoringDashboard />} />
                        <Route path="/admin/audit" element={<AuditLogs />} />
                        <Route path="/admin/audit/:id" element={<AuditLogDetail />} />
                        <Route path="/admin/keys" element={<SigningKeys />} />
                    </Route>
                </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
        </Route>
    )
)

export const App = () => (
    <AlertsProvider plugin={false} parentAlertsAdd={undefined as unknown as () => void} showAlertsInPlugin={false}>
        <CssReset />
        <CssVariables colors theme layers spacers elevations />
        <ErrorBoundary>
            <RouterProvider router={router} />
        </ErrorBoundary>
        <Alerts />
    </AlertsProvider>
)
