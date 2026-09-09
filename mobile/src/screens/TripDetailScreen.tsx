import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ApiError, apiRequest } from "../api/client";
import { Booking, Trip, WaitlistEntry } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { GaugeRing } from "../components/GaugeRing";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusPill } from "../components/StatusPill";
import { colors, spacing } from "../theme";
import { formatTripDateFull } from "../utils/format";

export function TripDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tripId } = route.params as { tripId: string };

  const [trip, setTrip] = useState<Trip | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [claimingWaitlist, setClaimingWaitlist] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tripResponse, bookingResponse] = await Promise.all([
        apiRequest<{ trip: Trip }>(`/trips/${tripId}`),
        apiRequest<{
          booking: Booking | null;
          waitlistEntry: WaitlistEntry | null;
        }>(`/bookings/trip/${tripId}`),
      ]);
      setTrip(tripResponse.trip);
      setBooking(bookingResponse.booking);
      setWaitlistEntry(bookingResponse.waitlistEntry);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Could not load this trip.",
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleJoinWaitlist() {
    if (!trip) return;
    setJoiningWaitlist(true);
    try {
      await apiRequest(`/bookings/${trip.id}/waitlist`, { method: "POST" });
      Alert.alert(
        "Waitlist joined",
        "Staff can now see your waitlist entry. A spot is not reserved until you successfully claim it.",
      );
      await load();
    } catch (requestError) {
      Alert.alert(
        "Waitlist failed",
        requestError instanceof ApiError
          ? requestError.message
          : "Could not join the waitlist.",
      );
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function handleClaimWaitlist() {
    if (!trip) return;
    setClaimingWaitlist(true);
    try {
      await apiRequest(`/bookings/${trip.id}/waitlist/claim`, { method: "POST" });
      Alert.alert(
        "Spot claimed",
        "Your booking is confirmed. Add any equipment you want staff to prepare.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("SelectEquipment", {
                tripId: trip.id,
                trip,
              }),
          },
        ],
      );
      await load();
    } catch (requestError) {
      Alert.alert(
        "Claim failed",
        requestError instanceof ApiError
          ? requestError.message
          : "Could not claim this place.",
      );
      await load();
    } finally {
      setClaimingWaitlist(false);
    }
  }

  async function cancelBooking() {
    if (!trip) return;
    setCancellingBooking(true);
    try {
      await apiRequest(`/bookings/${trip.id}/cancel`, { method: "POST" });
      Alert.alert("Booking cancelled", "Your place on this trip has been released.");
      await load();
    } catch (requestError) {
      Alert.alert(
        "Cancellation failed",
        requestError instanceof ApiError
          ? requestError.message
          : "Could not cancel this booking.",
      );
    } finally {
      setCancellingBooking(false);
    }
  }

  function confirmCancellation() {
    Alert.alert(
      "Cancel this booking?",
      "This releases your place. Your equipment requests remain in the historical booking record.",
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: () => void cancelBooking(),
        },
      ],
    );
  }

  if (loading && !trip) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Trip" />
        <View style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={colors.sky400} />
        </View>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.fill}>
        <ScreenHeader title="Trip" />
        {error && <ErrorBanner message={error} onRetry={load} />}
      </View>
    );
  }

  const capacity = trip.capacity;
  const isFull = trip.confirmedCount >= capacity;
  const isScheduled = trip.status === "SCHEDULED";
  const isBooked = booking?.status === "CONFIRMED";

  return (
    <View style={styles.fill}>
      <ScreenHeader
        title={
          trip.site?.name ??
          (trip.siteEstimated ? "Destination TBD" : "Site not set")
        }
        subtitle={formatTripDateFull(trip.date)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <Card>
          <View style={styles.headerRow}>
            <StatusPill
              label={trip.status}
              tone={
                trip.status === "CANCELLED"
                  ? "danger"
                  : trip.status === "COMPLETED"
                    ? "neutral"
                    : "success"
              }
            />
            {trip.siteEstimated && (
              <StatusPill label="Destination estimated" tone="warning" />
            )}
            {isBooked && <StatusPill label="You are booked" tone="success" />}
            {!isBooked && waitlistEntry?.status === "WAITING" ? (
              <StatusPill label="On waitlist" tone="warning" />
            ) : null}
            {!isBooked && waitlistEntry?.status === "NOTIFIED" ? (
              <StatusPill label="Spot available" tone="success" />
            ) : null}
          </View>

          <Text style={styles.label}>Boat</Text>
          <Text style={styles.value}>{trip.boat.name}</Text>

          <Text style={styles.label}>Meet / Launch</Text>
          <Text style={styles.value}>
            {trip.meetTime} meet · {trip.launchTime} launch
          </Text>

          {trip.launchSite ? (
            <>
              <Text style={styles.label}>Launch site</Text>
              <Text style={styles.value}>{trip.launchSite.name}</Text>
              {trip.launchSite.address ? (
                <Text style={styles.secondaryValue}>{trip.launchSite.address}</Text>
              ) : null}
            </>
          ) : null}

          {trip.cancelledReason ? (
            <>
              <Text style={styles.label}>Cancellation reason</Text>
              <Text style={styles.value}>{trip.cancelledReason}</Text>
            </>
          ) : null}

          <View style={styles.gaugeWrap}>
            <GaugeRing
              value={capacity > 0 ? trip.confirmedCount / capacity : 0}
              label="Spots filled"
              valueLabel={`${trip.confirmedCount}/${capacity}`}
              slots={Math.max(1, capacity)}
            />
          </View>
        </Card>

        <View style={styles.actionRow}>
          {isBooked ? (
            <>
              <Button
                label="Edit equipment request"
                onPress={() =>
                  navigation.navigate("SelectEquipment", {
                    tripId: trip.id,
                    trip,
                  })
                }
              />
              <Button
                label="Cancel booking"
                onPress={confirmCancellation}
                loading={cancellingBooking}
                variant="secondary"
              />
            </>
          ) : !isScheduled ? (
            <Button
              label={`Trip ${trip.status.toLowerCase()}`}
              onPress={() => undefined}
              disabled
            />
          ) : waitlistEntry?.status === "NOTIFIED" ? (
            <Button
              label="Claim open spot"
              onPress={handleClaimWaitlist}
              loading={claimingWaitlist}
            />
          ) : waitlistEntry?.status === "WAITING" ? (
            <Button
              label="You are on the waitlist"
              onPress={() => undefined}
              disabled
              variant="secondary"
            />
          ) : isFull ? (
            <Button
              label="Join waitlist"
              onPress={handleJoinWaitlist}
              loading={joiningWaitlist}
              variant="secondary"
            />
          ) : (
            <Button
              label="Choose equipment and book"
              onPress={() =>
                navigation.navigate("SelectEquipment", {
                  tripId: trip.id,
                  trip,
                })
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.deepSea900 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  loadingPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.slate600,
    marginTop: spacing.md,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.navy900,
    marginTop: 2,
  },
  secondaryValue: {
    fontSize: 13,
    color: colors.slate600,
    marginTop: 2,
  },
  gaugeWrap: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  actionRow: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
});
