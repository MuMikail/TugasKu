import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Easing,
  Alert,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "twrnc";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";

export default function TodoList() {
  const [mataPelajaran, setMataPelajaran] = useState("");
  const [judulTugas, setJudulTugas] = useState("");
  const [deadline, setDeadline] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [list, setList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Animation states
  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  // Animation refs for task deletion
  const taskAnimations = useRef({}).current;
  const [itemsToDelete, setItemsToDelete] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    saveTasks();
  }, [list]);

  // Initialize animation values for new tasks
  useEffect(() => {
    list.forEach((item) => {
      if (!taskAnimations[item.id]) {
        taskAnimations[item.id] = {
          translateX: new Animated.Value(0),
          opacity: new Animated.Value(1),
          height: new Animated.Value(0),
        };

        // Measure and set the initial height
        setTimeout(() => {
          taskAnimations[item.id].height.setValue(1);
        }, 50);
      }
    });
  }, [list]);

  const formatDate = (date) => {
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const showPicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
    setDeadline(formatDate(currentDate));
  };

  // Animation function for checkmark
  const animateCheckmark = () => {
    setShowCheckmark(true);

    // Reset animation values
    checkmarkOpacity.setValue(0);
    checkmarkScale.setValue(0);

    // Start animations
    Animated.parallel([
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(checkmarkScale, {
        toValue: 1,
        duration: 300,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hide checkmark after 1.5 seconds
      setTimeout(() => {
        Animated.timing(checkmarkOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowCheckmark(false);
        });
      }, 1500);
    });
  };

  const addTask = () => {
    if (mataPelajaran.trim() === "" || judulTugas.trim() === "") {
      Alert.alert("Duh", "Belom Kamu Isi");
      return;
    }
    if (mataPelajaran.trim().length < 3) {
      Alert.alert("Duh", "Yang Bener Kids Isinya");
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      mataPelajaran: mataPelajaran.trim(),
      judulTugas: judulTugas.trim(),
      deadline: deadline,
      completed: false, // Add completed status
    };

    setList([...list, newTask]);
    setMataPelajaran("");
    setJudulTugas("");
    setDeadline("");

    // Show checkmark animation
    animateCheckmark();
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(list));
      console.log("Data Tersimpan");
    } catch (error) {
      console.log("Gagal simpan:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const saved = await AsyncStorage.getItem("tasks");
      if (saved !== null) {
        setList(JSON.parse(saved));
      }
    } catch (error) {
      console.log("Gagal Load:", error);
    }
  };

  const deleteTask = (id) => {
    Alert.alert(
      "Konfirmasi Hapus",
      "Apakah kamu yakin ingin menghapus tugas ini?",
      [
        {
          text: "Batal",
          style: "cancel"
        },
        {
          text: "Hapus",
          onPress: () => {
            // Add to items being deleted
            setItemsToDelete((prev) => [...prev, id]);

            // Animate the task out
            Animated.parallel([
              Animated.timing(taskAnimations[id].translateX, {
                toValue: -500,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.ease,
              }),
              Animated.timing(taskAnimations[id].opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // After animation completes, remove from list
              const filtered = list.filter((item) => item.id !== id);
              setList(filtered);
              setItemsToDelete((prev) => prev.filter((itemId) => itemId !== id));

              // Clean up animation references
              delete taskAnimations[id];
            });
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleEdit = () => {
    Alert.alert(
      "Konfirmasi Edit",
      "Apakah kamu yakin ingin memperbarui tugas ini?",
      [
        {
          text: "Batal",
          style: "cancel"
        },
        {
          text: "Perbarui",
          onPress: () => {
            const updated = list.map((item) =>
              item.id === editId
                ? {
                    ...item,
                    mataPelajaran: mataPelajaran.trim(),
                    judulTugas: judulTugas.trim(),
                    deadline: deadline,
                  }
                : item
            );
            setList(updated);
            setMataPelajaran("");
            setJudulTugas("");
            setDeadline("");
            setIsEditing(false);
            setEditId(null);

            // Show checkmark animation for edit too
            animateCheckmark();
          }
        }
      ]
    );
  };

  const startEdit = (item) => {
    setMataPelajaran(item.mataPelajaran || "");
    setJudulTugas(item.judulTugas || "");
    setDeadline(item.deadline || "");

    if (item.deadline) {
      const parts = item.deadline.split(" ");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthNames = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];
        const month = monthNames.indexOf(parts[1]);
        const year = parseInt(parts[2], 10);
        if (month !== -1) {
          setDate(new Date(year, month, day));
        }
      }
    }

    setIsEditing(true);
    setEditId(item.id);
  };

  // Toggle task completion status
  const toggleTaskCompletion = (id) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setList(updated);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8faff]`}>
      <ScrollView>
        <StatusBar barStyle="dark-content" backgroundColor="#f8faff" />

        <LinearGradient
          colors={["#3b82f6", "#1e40af"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`absolute top-0 left-0 right-0 h-60 rounded-b-[40px]`}
        />

        <View style={tw`px-5 flex-1 pt-4`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-4xl`}>📝</Text>
              <View style={tw`ml-3`}>
                <Text style={tw`text-3xl font-bold text-white`}>TugasKu</Text>
                <Text style={tw`text-white opacity-80`}>
                  Kelola tugas dengan mudah
                </Text>
              </View>
            </View>
          </View>

          <View
            style={tw`mb-6 bg-white p-5 rounded-3xl shadow-lg border border-blue-50 elevation-5`}
          >
            <Text style={tw`text-xl font-bold text-blue-900 mb-4`}>
              {isEditing ? "Edit Tugas" : "Tambah Tugas Baru"}
            </Text>

            <View style={tw`mb-4`}>
              <Text style={tw`text-blue-800 mb-1 font-medium`}>
                Mata Pelajaran
              </Text>
              <View
                style={tw`flex-row items-center bg-blue-50 px-4 py-3 rounded-xl border border-blue-100`}
              >
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={20}
                  color="#3b82f6"
                />
                <TextInput
                  placeholder="Masukkan mata pelajaran..."
                  value={mataPelajaran}
                  onChangeText={setMataPelajaran}
                  style={tw`flex-1 ml-2 text-base text-blue-900`}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-blue-800 mb-1 font-medium`}>
                Judul Tugas
              </Text>
              <View
                style={tw`flex-row items-center bg-blue-50 px-4 py-3 rounded-xl border border-blue-100`}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={20}
                  color="#3b82f6"
                />
                <TextInput
                  placeholder="Masukkan judul tugas..."
                  value={judulTugas}
                  onChangeText={setJudulTugas}
                  style={tw`flex-1 ml-2 text-base text-blue-900`}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-blue-800 mb-1 font-medium`}>Deadline</Text>
              <View style={tw`flex-row`}>
                <View
                  style={tw`flex-row items-center flex-1 mr-2 bg-blue-50 px-4 py-3 rounded-xl border border-blue-100`}
                >
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={20}
                    color="#3b82f6"
                  />
                  <TextInput
                    placeholder="Pilih tanggal deadline..."
                    value={deadline}
                    editable={false}
                    style={tw`flex-1 ml-2 text-base text-blue-900`}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <TouchableOpacity
                  onPress={showPicker}
                  style={tw`bg-blue-500 p-3.5 rounded-xl`}
                >
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color="white"
                    style={tw`mt-2.3`}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
            )}

            <TouchableOpacity
              style={tw`py-4 rounded-xl w-full items-center mt-2 ${
                isEditing ? "bg-green-500" : "bg-blue-600"
              }`}
              onPress={isEditing ? handleEdit : addTask}
            >
              <Text style={tw`text-white font-bold text-base`}>
                {isEditing ? "Perbarui Tugas" : "Tambah Tugas"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-xl font-bold text-blue-900`}>
              Daftar Tugas
            </Text>
            <Text style={tw`text-blue-600 font-medium mr-2`}>
              {list.length} tugas
            </Text>
          </View>
          {list.length === 0 ? (
            <View
            style={tw`items-center justify-center py-10 bg-white rounded-3xl shadow-sm border border-blue-50`}
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/7486/7486754.png",
                }}
                style={tw`w-20 h-20 opacity-50`}
              />
              <Text style={tw`text-gray-400 text-lg mt-4`}>
                Belum ada tugas
              </Text>
              <Text style={tw`text-gray-400 text-sm`}>
                Tambahkan tugas baru di atas
              </Text>
            </View>
          ) : (
            <ScrollView
              style={tw`flex-1`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`pb-4`}
            >
              {list.map((item) => {
                // Initialize animation values if they don't exist
                if (!taskAnimations[item.id]) {
                  taskAnimations[item.id] = {
                    translateX: new Animated.Value(0),
                    opacity: new Animated.Value(1),
                    height: new Animated.Value(1),
                  };
                }

                const isBeingDeleted = itemsToDelete.includes(item.id);

                return (
                  <Animated.View
                    key={item.id}
                    style={[
                      tw`mb-3 overflow-hidden`,
                      {
                        transform: [
                          { translateX: taskAnimations[item.id].translateX },
                        ],
                        opacity: taskAnimations[item.id].opacity,
                      },
                    ]}
                  >
                    <View
                      style={tw`p-4 border border-blue-100 rounded-2xl bg-white shadow-sm`}
                    >
                      <View style={tw`flex-row items-center`}>
                        {/* Left side with checkbox */}
                        <TouchableOpacity
                          onPress={() => toggleTaskCompletion(item.id)}
                          style={tw`mr-3`}
                          disabled={isBeingDeleted}
                        >
                          <View
                            style={tw`w-6 h-6 rounded-full border-2 ${
                              item.completed
                                ? "bg-green-500 border-green-500"
                                : "border-gray-300"
                            } items-center justify-center`}
                          >
                            {item.completed && (
                              <MaterialCommunityIcons
                                name="check"
                                size={16}
                                color="white"
                              />
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* Content area */}
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-2xl font-bold text-blue-900`}>
                            {item.mataPelajaran}
                          </Text>

                          <View style={tw`mt-1`}>
                            <Text style={tw`text-base text-gray-600`}>
                              {item.judulTugas}
                            </Text>

                            {item.deadline ? (
                              <View style={tw`flex-row items-center mt-1`}>
                                <Text
                                  style={tw`text-xl text-blue-500 font-medium`}
                                >
                                  {item.deadline}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Right side with action buttons */}
                        <View style={tw`flex-row ml-2`}>
                          <TouchableOpacity
                            onPress={() => startEdit(item)}
                            style={tw`p-2 mr-2 bg-blue-100 rounded-full`}
                            disabled={isBeingDeleted}
                          >
                            <MaterialCommunityIcons
                              name="pencil-outline"
                              size={20}
                              color="#3b82f6"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteTask(item.id)}
                            style={tw`p-2 bg-red-100 rounded-full`}
                            disabled={isBeingDeleted}
                          >
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={20}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Checkmark animation overlay */}
      {showCheckmark && (
        <View
          style={tw`absolute inset-0 items-center justify-center bg-black bg-opacity-30`}
        >
          <Animated.View
            style={[
              tw`bg-green-500 rounded-full p-5`,
              {
                opacity: checkmarkOpacity,
                transform: [{ scale: checkmarkScale }],
              },
            ]}
          >
            <MaterialCommunityIcons name="check" size={50} color="white" />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
