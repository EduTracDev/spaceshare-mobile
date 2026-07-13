import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, ScrollView, Dimensions, PanResponder,
  ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export interface FilterValues {
  location: string;
  minPrice: number;
  maxPrice: number;
  capacity: number;
  amenities: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: Partial<FilterValues>;
  priceCeiling?: number;
  capacityCeiling?: number;
}

const AMENITIES = ['Wi-Fi', 'AC', 'Parking', 'Security', 'Sound System', 'Light', 'Generator', 'Others'];
const THUMB_SIZE = 20;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Dual-thumb range slider — anchors drag start position so dx never compounds */
function RangeSlider({
  min, max, valueMin, valueMax, onChange,
}: {
  min: number; max: number; valueMin: number; valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const live = useRef({ min, max, valueMin, valueMax, onChange, trackWidth });
  useEffect(() => {
    live.current = { min, max, valueMin, valueMax, onChange, trackWidth };
  });

  const minStartX = useRef(0);
  const maxStartX = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const getUsable = () => Math.max(live.current.trackWidth - THUMB_SIZE, 1);
  const toX = (v: number, usable: number) =>
    ((v - live.current.min) / (live.current.max - live.current.min)) * usable;
  const toValue = (x: number, usable: number) =>
    Math.round(live.current.min + (clamp(x, 0, usable) / usable) * (live.current.max - live.current.min));

  const minResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const usable = getUsable();
        minStartX.current = toX(live.current.valueMin, usable);
      },
      onPanResponderMove: (_, g) => {
        const usable = getUsable();
        const maxX = toX(live.current.valueMax, usable);
        const x = clamp(minStartX.current + g.dx, 0, maxX);
        live.current.onChange(toValue(x, usable), live.current.valueMax);
      },
    })
  ).current;

  const maxResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const usable = getUsable();
        maxStartX.current = toX(live.current.valueMax, usable);
      },
      onPanResponderMove: (_, g) => {
        const usable = getUsable();
        const minX = toX(live.current.valueMin, usable);
        const x = clamp(maxStartX.current + g.dx, minX, usable);
        live.current.onChange(live.current.valueMin, toValue(x, usable));
      },
    })
  ).current;

  const usable = getUsable();

  return (
    <View style={rs.wrap} onLayout={onLayout}>
      <View style={rs.track} />
      {trackWidth > 0 && (
        <>
          <View style={[rs.activeTrack, {
            left: toX(valueMin, usable) + THUMB_SIZE / 2,
            width: toX(valueMax, usable) - toX(valueMin, usable),
          }]} />
          <View {...minResponder.panHandlers} style={[rs.thumb, { left: toX(valueMin, usable) }]} />
          <View {...maxResponder.panHandlers} style={[rs.thumb, { left: toX(valueMax, usable) }]} />
        </>
      )}
    </View>
  );
}

const rs = StyleSheet.create({
  wrap: { height: 30, justifyContent: 'center', width: '100%' },
  track: { height: 3, borderRadius: 2, backgroundColor: '#E4E7EC', width: '100%' },
  activeTrack: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: '#6200EE' },
  thumb: {
    position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#6200EE',
  },
});

/** Single-thumb slider — same anchored-drag approach */
function SingleSlider({
  min, max, value, onChange,
}: {
  min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const live = useRef({ min, max, value, onChange, trackWidth });
  useEffect(() => {
    live.current = { min, max, value, onChange, trackWidth };
  });

  const startX = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const getUsable = () => Math.max(live.current.trackWidth - THUMB_SIZE, 1);
  const toX = (v: number, usable: number) =>
    ((v - live.current.min) / (live.current.max - live.current.min)) * usable;
  const toValue = (x: number, usable: number) =>
    Math.round(live.current.min + (clamp(x, 0, usable) / usable) * (live.current.max - live.current.min));

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const usable = getUsable();
        startX.current = toX(live.current.value, usable);
      },
      onPanResponderMove: (_, g) => {
        const usable = getUsable();
        const x = clamp(startX.current + g.dx, 0, usable);
        live.current.onChange(toValue(x, usable));
      },
    })
  ).current;

  const usable = getUsable();

  return (
    <View style={rs.wrap} onLayout={onLayout}>
      <View style={rs.track} />
      {trackWidth > 0 && (
        <>
          <View style={[rs.activeTrack, { left: 0, width: toX(value, usable) + THUMB_SIZE / 2 }]} />
          <View {...responder.panHandlers} style={[rs.thumb, { left: toX(value, usable) }]} />
        </>
      )}
    </View>
  );
}

export default function FilterModal({
  visible, onClose, onApply,
  initialFilters, priceCeiling = 500000, capacityCeiling = 100,
}: Props) {
  const [location, setLocation] = useState(initialFilters?.location ?? '');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice ?? priceCeiling);
  const [capacity, setCapacity] = useState(initialFilters?.capacity ?? 10);
  const [amenities, setAmenities] = useState<string[]>(initialFilters?.amenities ?? []);
  const [loading, setLoading] = useState(false);

  // Swipe-down-to-dismiss on the handle bar
  const dismissResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          onClose();
        }
      },
    })
  ).current;

  const toggleAmenity = (name: string) => {
    setAmenities(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleReset = () => {
    setLocation('');
    setMinPrice(0);
    setMaxPrice(priceCeiling);
    setCapacity(10);
    setAmenities([]);
  };

  const handleShowResult = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onApply({ location, minPrice, maxPrice, capacity, amenities });
    }, 900);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <BlurView intensity={30} tint="dark" style={s.overlay}>
        <View style={s.sheetWrap}>
          <View style={s.sheet}>

            <View {...dismissResponder.panHandlers} style={s.handle} />

            {loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color="#6200EE" />
              </View>
            ) : (
              <>
                <View style={s.header}>
                  <Text style={s.title}>Filters</Text>
                  <TouchableOpacity onPress={handleReset}>
                    <Text style={s.resetText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>

                  {/* Location */}
                  <Text style={s.label}>Location</Text>
                  <View style={s.locationBox}>
                    <Feather name="search" size={16} color="#98A2B3" />
                    <TextInput
                      style={s.locationInput}
                      placeholder="Search for a location"
                      placeholderTextColor="#98A2B3"
                      value={location}
                      onChangeText={setLocation}
                    />
                    {location.length > 0 && (
                      <TouchableOpacity onPress={() => setLocation('')}>
                        <Feather name="x" size={16} color="#98A2B3" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Price range */}
                  <View style={s.sectionSpacing}>
                    <Text style={s.label}>Price range</Text>
                    <View style={s.rangeLabels}>
                      <Text style={s.rangeValue}>₦{minPrice.toLocaleString()}</Text>
                      <Text style={s.rangeValue}>₦{maxPrice.toLocaleString()}</Text>
                    </View>
                    <View style={s.sliderContainer}>
                      <RangeSlider
                        min={0}
                        max={priceCeiling}
                        valueMin={minPrice}
                        valueMax={maxPrice}
                        onChange={(mn, mx) => { setMinPrice(mn); setMaxPrice(mx); }}
                      />
                    </View>
                  </View>

                  {/* Capacity */}
                  <View style={s.sectionSpacing}>
                    <Text style={s.label}>Capacity</Text>
                    <Text style={s.capacityValue}>{capacity}+ guest</Text>
                    <View style={s.sliderContainer}>
                      <SingleSlider
                        min={1}
                        max={capacityCeiling}
                        value={capacity}
                        onChange={setCapacity}
                      />
                    </View>
                  </View>

                  {/* Amenities */}
                  <View style={s.sectionSpacing}>
                    <Text style={s.label}>Amenities</Text>
                    <View style={s.amenitiesGrid}>
                      {AMENITIES.map((name) => {
                        const checked = amenities.includes(name);
                        return (
                          <TouchableOpacity
                            key={name}
                            style={s.amenityRow}
                            onPress={() => toggleAmenity(name)}
                          >
                            <View style={[s.checkbox, checked && s.checkboxChecked]}>
                              {checked && <Feather name="check" size={11} color="#FFFFFF" />}
                            </View>
                            <Text style={s.amenityText}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>

                <View style={s.footer}>
                  <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.showBtn} onPress={handleShowResult}>
                    <Text style={s.showBtnText}>Show Result</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  sheetWrap: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    height: height * 0.82,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E4E7EC',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
    paddingVertical: 10, // enlarges the touch target without changing visible size
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'MonaSans-Bold', fontSize: 18, color: '#020203' },
  resetText: { fontFamily: 'Inter-Regular', fontSize: 14, fontWeight: '600', color: '#6200EE' },

  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E', marginBottom: 8 },
  locationBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12,
    paddingHorizontal: 12, height: 46,
  },
  locationInput: { flex: 1, fontSize: 14, color: '#020203' },

  sectionSpacing: { marginTop: 24 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rangeValue: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203' },
  capacityValue: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 13, color: '#020203', marginBottom: 8 },

  sliderContainer: {
    paddingHorizontal: 4,
    alignSelf: 'stretch',
  },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 24 },
  amenityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '40%' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0D5DD',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
  amenityText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#3A414E' },

  footer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 99, backgroundColor: '#EDE7F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15, color: '#6200EE' },
  showBtn: {
    flex: 2, height: 52, borderRadius: 99, backgroundColor: '#6200EE',
    alignItems: 'center', justifyContent: 'center',
  },
  showBtnText: { color: '#FFFFFF', fontFamily: 'Inter-Regular', fontWeight: '600', fontSize: 15 },
});