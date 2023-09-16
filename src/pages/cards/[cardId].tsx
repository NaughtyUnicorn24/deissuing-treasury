import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Link,
  Stack,
  SvgIcon,
  Typography,
} from "@mui/material";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import React, { ReactNode } from "react";
import Stripe from "stripe";

import FloatingTestPanel from "src/components/floating-test-panel";
import DashboardLayout from "src/layouts/dashboard/layout";
import CardDetails from "src/sections/[cardId]/card-details";
import CardIllustration from "src/sections/[cardId]/card-illustration";
import LatestCardAuthorizations from "src/sections/[cardId]/latest-card-authorizations";
import { isDemoMode } from "src/utils/demo-helpers";
import { formatUSD } from "src/utils/format";
import { getSessionForServerSideProps } from "src/utils/session-helpers";
import { getCardDetails } from "src/utils/stripe_helpers";

export const getServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const session = await getSessionForServerSideProps(context);
  const cardId = context?.params?.cardId?.toString();
  if (cardId === undefined) {
    throw new Error("cardId must be provided");
  }
  const StripeAccountID = session.accountId;
  const cardTransactions = await getCardDetails(StripeAccountID, cardId);

  return {
    props: {
      authorizations: cardTransactions.card_authorizations,
      currentSpend: cardTransactions.current_spend,
      accountId: StripeAccountID,
      cardId: context?.params?.cardId,
      card: cardTransactions.card_details,
    },
  };
};

const Page = ({
  authorizations,
  currentSpend,
  accountId,
  cardId,
  card,
}: {
  authorizations: Stripe.Issuing.Authorization[];
  currentSpend: number;
  accountId: string;
  cardId: string;
  card: Stripe.Issuing.Card;
}) => {
  const router = useRouter();

  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (stripePublishableKey === undefined) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be defined");
  }

  const stripePromise = loadStripe(stripePublishableKey, {
    stripeAccount: accountId,
  });

  const spendingLimit = card.spending_controls.spending_limits?.[0];
  const spendingLimitDisplay =
    spendingLimit != undefined
      ? `${formatUSD(spendingLimit.amount / 100)} ${spendingLimit.interval}`
      : "No spending limit set";

  return (
    <>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={3} justifyContent="center">
            <Grid item sx={{ width: "100%", maxWidth: 500 }}>
              <Box sx={{ borderRadius: 2, boxShadow: 12 }}>
                <Elements stripe={stripePromise}>
                  <CardIllustration cardId={cardId} card={card} brand="VISA" />
                </Elements>
              </Box>
            </Grid>
            <Grid item xs={true} sm={true} md={true} lg={true} xl={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack
                    alignItems="flex-start"
                    direction="row"
                    justifyContent="space-between"
                    spacing={3}
                  >
                    <Stack spacing={1}>
                      <Typography color="text.secondary" variant="overline">
                        Current spend
                      </Typography>
                      <Typography variant="h4">
                        {formatUSD(currentSpend / 100)}
                      </Typography>
                      <Typography pt={1} color="text.secondary">
                        Spending limit:
                      </Typography>
                      <Typography variant="h5">
                        {spendingLimitDisplay}
                      </Typography>
                    </Stack>
                    <Avatar
                      sx={{
                        backgroundColor: "error.main",
                        height: 56,
                        width: 56,
                      }}
                    >
                      <SvgIcon>
                        <CurrencyDollarIcon />
                      </SvgIcon>
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={12} md={12} lg={12} xl={true}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <CardDetails card={card} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <LatestCardAuthorizations authorizations={authorizations} />
            </Grid>
          </Grid>
        </Container>
      </Box>
      {/* The demo mode flag can be removed from here once the Issuing spend card test helpers are GA-ed */}
      {(!isDemoMode() || router.query.debug) && (
        <GenerateTestDataDrawer cardId={cardId} />
      )}
    </>
  );
};

// FOR-DEMO-ONLY: This component is only useful for generating test data for demonstration purposes and can be removed
// for a real application.
const GenerateTestDataDrawer = ({ cardId }: { cardId: string }) => {
  const { data: session } = useSession();
  if (session == undefined) {
    throw new Error("Session is missing in the request");
  }

  return (
    <FloatingTestPanel title="Create a test authorization">
      <Typography variant="body2">
        You can create a test authorization by{" "}
        <Link
          href={`https://dashboard.stripe.com/${session.accountId}/test/issuing/cards/${cardId}`}
          target="_blank"
          underline="none"
        >
          going to this card&apos;s overview in the Stripe dashboard{" "}
          <SvgIcon fontSize="small" sx={{ verticalAlign: "top" }}>
            <ArrowTopRightOnSquareIcon />
          </SvgIcon>
        </Link>{" "}
        and clicking on the &quot;Create test purchase&quot; button.
      </Typography>
    </FloatingTestPanel>
  );
};

Page.getLayout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
