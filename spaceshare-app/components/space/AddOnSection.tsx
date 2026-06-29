import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';

type AddOn = {
  name: string;
  price: number;
  available: number;
};

type Props = {
  addOns: AddOn[];
  onTotalChange: (total: number) => void;
};

export default function AddOnSection({ addOns, onTotalChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<{ [key: string]: number }>({});

  const handleAdd = (name: string, price: number) => {
    const newSelected = { ...selected, [name]: (selected[name] || 0) + 1 };
    setSelected(newSelected);
    const total = Object.entries(newSelected).reduce((sum, [key, qty]) => {
      const item = addOns.find((a) => a.name === key);
      return sum + (item ? item.price * qty : 0);
    }, 0);
    onTotalChange(total);
  };

  const handleRemove = (name: string, price: number) => {
    if (!selected[name]) return;
    const newSelected = { ...selected, [name]: selected[name] - 1 };
    if (newSelected[name] === 0) delete newSelected[name];
    setSelected(newSelected);
    const total = Object.entries(newSelected).reduce((sum, [key, qty]) => {
      const item = addOns.find((a) => a.name === key);
      return sum + (item ? item.price * qty : 0);
    }, 0);
    onTotalChange(total);
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>Add-On</Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#6A7181"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.box}>
          {addOns.map((item, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>
                  ₦{item.price.toLocaleString()} • {item.available} available
                </Text>
              </View>
              <View style={styles.counter}>
                {selected[item.name] ? (
                  <>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => handleRemove(item.name, item.price)}
                    >
                      <Feather name="minus" size={14} color="#6200EE" />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{selected[item.name]}</Text>
                  </>
                ) : null}
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleAdd(item.name, item.price)}
                >
                  <Feather name="plus" size={14} color="#6200EE" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  title: {
    fontFamily: 'MonaSans-Bold',
    fontSize: 16,
    color: '#020203',
    letterSpacing: -0.3,
  },
  box: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    gap: 14,
    marginBottom: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    gap: 2,
    flex: 1,
  },
  itemName: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
  },
  itemSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6A7181',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    fontSize: 14,
    color: '#020203',
    minWidth: 16,
    textAlign: 'center',
  },
});