import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { GuideTabs } from "./components/GuideTabs";
import { Layout } from "./components/Layout";
import { AccessScreen } from "./components/AccessScreen";
import { Splash } from "./components/Splash";
import { Empty, Loading } from "./components/ui";
import { AuthProvider, useAuth } from "./lib/auth";
import { FiltersProvider } from "./lib/filters";
import { introSeen, markIntroSeen } from "./lib/intro";

const AccountAssessment = lazy(
  () => import("./pages/overview/AccountAssessment"),
);
const QuestionsByDimension = lazy(
  () => import("./pages/overview/QuestionsByDimension"),
);
const CompetitorComparison = lazy(
  () => import("./pages/overview/CompetitorComparison"),
);
const JourneyAssessment = lazy(
  () => import("./pages/overview/JourneyAssessment"),
);
const EvidenceRegister = lazy(
  () => import("./pages/overview/EvidenceRegister"),
);
const ScoreRegister = lazy(() => import("./pages/overview/ScoreRegister"));
const SourceRegister = lazy(() => import("./pages/overview/SourceRegister"));
const Capabilities = lazy(() => import("./pages/actions/Capabilities"));
const EvidenceGaps = lazy(() => import("./pages/actions/EvidenceGaps"));
const NextActions = lazy(() => import("./pages/actions/NextActions"));
const WhereStopped = lazy(() => import("./pages/actions/WhereStopped"));
const NotPublished = lazy(() => import("./pages/actions/NotPublished"));
const Caveats = lazy(() => import("./pages/actions/Caveats"));
const QuestionSet = lazy(() => import("./pages/guide/QuestionSet"));
const Accounts = lazy(() => import("./pages/guide/Accounts"));
const DM8 = lazy(() => import("./pages/guide/DM8"));
const Dimensions = lazy(() => import("./pages/guide/Dimensions"));
const Levels = lazy(() => import("./pages/guide/Levels"));
const Framework = lazy(() => import("./pages/guide/Framework"));
const EvidenceQuality = lazy(() => import("./pages/guide/EvidenceQuality"));
const Freshness = lazy(() => import("./pages/guide/Freshness"));
const Users = lazy(() => import("./pages/admin/Users"));
const EvidenceApproval = lazy(() => import("./pages/admin/EvidenceApproval"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const AccessRequests = lazy(() => import("./pages/admin/AccessRequests"));

export default function App() {
  // The intro plays on the first load of a session only (not on reload); sign-out resets it
  const [intro, setIntro] = useState(() => !introSeen());
  useEffect(() => {
    if (intro) markIntroSeen();
  }, [intro]);
  return (
    <AuthProvider>
      {intro && <Splash onDone={() => setIntro(false)} />}
      {!intro && <Gate />}
    </AuthProvider>
  );
}

/** After the intro: the app, or a screen explaining why access was refused. No sign-in page. */
function Gate() {
  const { status } = useAuth();
  if (status === "loading")
    return (
      <div className="boot" aria-busy="true">
        Opening…
      </div>
    );
  if (status === "redirecting")
    return (
      <div className="boot" aria-busy="true">
        Taking you to Microsoft sign-in…
      </div>
    );
  if (status !== "signedIn") return <AccessScreen />;
  return (
    <FiltersProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route
              index
              element={<Navigate to="/overview/account-assessment" replace />}
            />
            <Route path="overview">
              <Route
                index
                element={<Navigate to="account-assessment" replace />}
              />
              <Route
                path="account-assessment"
                element={
                  <Page>
                    <AccountAssessment />
                  </Page>
                }
              />
              <Route
                path="questions-by-dimension"
                element={
                  <Page>
                    <QuestionsByDimension />
                  </Page>
                }
              />
              <Route
                path="competitor-comparison"
                element={
                  <Page>
                    <CompetitorComparison />
                  </Page>
                }
              />
              <Route
                path="journey-assessment"
                element={<Moved to="/admin/journey-assessment" />}
              />
              <Route
                path="evidence-register"
                element={<Moved to="/admin/evidence-register" />}
              />
              <Route
                path="score-register"
                element={<Moved to="/admin/score-register" />}
              />
              <Route
                path="source-register"
                element={<Moved to="/admin/source-register" />}
              />
            </Route>
            <Route path="actions">
              <Route index element={<Navigate to="capabilities" replace />} />
              <Route
                path="capabilities"
                element={
                  <Page>
                    <Capabilities />
                  </Page>
                }
              />
              <Route
                path="evidence-gaps"
                element={<Moved to="/admin/evidence-gaps" />}
              />
              <Route
                path="next-actions"
                element={<Moved to="/admin/next-actions" />}
              />
              <Route
                path="where-stopped"
                element={
                  <Page>
                    <WhereStopped />
                  </Page>
                }
              />
              <Route
                path="not-published"
                element={<Moved to="/admin/not-published" />}
              />
              <Route path="caveats" element={<Moved to="/admin/caveats" />} />
            </Route>
            <Route path="guide" element={<GuideTabs />}>
              <Route index element={<Navigate to="question-set" replace />} />
              <Route
                path="question-set"
                element={
                  <Page>
                    <QuestionSet />
                  </Page>
                }
              />
              <Route
                path="accounts"
                element={
                  <Page>
                    <Accounts />
                  </Page>
                }
              />
              <Route
                path="dm8-target"
                element={
                  <Page>
                    <DM8 />
                  </Page>
                }
              />
              <Route
                path="dimensions"
                element={
                  <Page>
                    <Dimensions />
                  </Page>
                }
              />
              <Route
                path="levels"
                element={
                  <Page>
                    <Levels />
                  </Page>
                }
              />
              <Route
                path="scoring-framework"
                element={
                  <Page>
                    <Framework />
                  </Page>
                }
              />
              <Route
                path="evidence-quality"
                element={
                  <Page>
                    <EvidenceQuality />
                  </Page>
                }
              />
              <Route
                path="freshness"
                element={
                  <Page>
                    <Freshness />
                  </Page>
                }
              />
            </Route>
            <Route path="admin">
              <Route index element={<Navigate to="users" replace />} />
              <Route
                path="users"
                element={
                  <AdminPage>
                    <Users />
                  </AdminPage>
                }
              />
              <Route
                path="journey-assessment"
                element={
                  <AdminPage>
                    <JourneyAssessment />
                  </AdminPage>
                }
              />
              <Route
                path="evidence-register"
                element={
                  <AdminPage>
                    <EvidenceRegister />
                  </AdminPage>
                }
              />
              <Route
                path="score-register"
                element={
                  <AdminPage>
                    <ScoreRegister />
                  </AdminPage>
                }
              />
              <Route
                path="source-register"
                element={
                  <AdminPage>
                    <SourceRegister />
                  </AdminPage>
                }
              />
              <Route
                path="evidence-gaps"
                element={
                  <AdminPage>
                    <EvidenceGaps />
                  </AdminPage>
                }
              />
              <Route
                path="next-actions"
                element={
                  <AdminPage>
                    <NextActions />
                  </AdminPage>
                }
              />
              <Route
                path="not-published"
                element={
                  <AdminPage>
                    <NotPublished />
                  </AdminPage>
                }
              />
              <Route
                path="caveats"
                element={
                  <AdminPage>
                    <Caveats />
                  </AdminPage>
                }
              />
              <Route
                path="access-requests"
                element={
                  <AdminPage>
                    <AccessRequests />
                  </AdminPage>
                }
              />
              <Route
                path="evidence-approval"
                element={
                  <AdminPage>
                    <EvidenceApproval />
                  </AdminPage>
                }
              />
              <Route
                path="settings"
                element={
                  <AdminPage>
                    <Settings />
                  </AdminPage>
                }
              />
            </Route>
            <Route
              path="*"
              element={<Navigate to="/overview/account-assessment" replace />}
            />
          </Route>
        </Routes>
      </Suspense>
    </FiltersProvider>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

/** Old links (before these pages moved to Admin) still work and keep the header filters. */
function Moved({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

function AdminPage({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin)
    return (
      <Empty title="Admins only.">Ask an admin if you need this page.</Empty>
    );
  return <Page>{children}</Page>;
}
