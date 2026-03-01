import React, { useState } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    Image,
    Text,
    StyleSheet,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageViewerProps {
    images: Array<{ uri: string }>;
    imageIndex: number;
    visible: boolean;
    onRequestClose: () => void;
    doubleTapToZoomEnabled?: boolean;
    swipeToCloseEnabled?: boolean;
    FooterComponent?: React.ComponentType<{ imageIndex: number }>;
}

export default function ImageViewer({
    images,
    imageIndex,
    visible,
    onRequestClose,
    FooterComponent,
}: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(imageIndex);

    const handlePrev = () => {
        setCurrentIndex((prev) =>
            prev > 0 ? prev - 1 : images.length - 1
        );
    };

    const handleNext = () => {
        setCurrentIndex((prev) =>
            prev < images.length - 1 ? prev + 1 : 0
        );
    };

    if (!visible || images.length === 0) {
        return null;
    }

    const currentImage = images[currentIndex];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onRequestClose}
        >
            <View style={styles.container}>
                {/* Close button */}
                <Pressable
                    onPress={onRequestClose}
                    style={styles.closeButton}
                >
                    <Ionicons name="close" size={32} color="white" />
                </Pressable>

                {/* Main image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: currentImage.uri }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                {/* Navigation buttons */}
                {images.length > 1 && (
                    <>
                        <Pressable
                            onPress={handlePrev}
                            style={styles.navButton}
                        >
                            <Ionicons name="chevron-back" size={32} color="white" />
                        </Pressable>

                        <Pressable
                            onPress={handleNext}
                            style={[styles.navButton, styles.navButtonRight]}
                        >
                            <Ionicons name="chevron-forward" size={32} color="white" />
                        </Pressable>
                    </>
                )}

                {/* Footer */}
                {FooterComponent && (
                    <View style={styles.footer}>
                        <FooterComponent imageIndex={currentIndex} />
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
        padding: 10,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    navButton: {
        position: 'absolute',
        padding: 10,
    },
    navButtonRight: {
        right: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
});
