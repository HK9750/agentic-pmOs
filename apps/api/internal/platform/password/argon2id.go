package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	memory      uint32 = 64 * 1024
	iterations  uint32 = 3
	parallelism uint8  = 1
	saltLength         = 16
	keyLength   uint32 = 32
)

var ErrInvalidHash = errors.New("invalid password hash")

func Hash(plain string) (string, error) {
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}

	key := argon2.IDKey([]byte(plain), salt, iterations, memory, parallelism, keyLength)

	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedKey := base64.RawStdEncoding.EncodeToString(key)

	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", memory, iterations, parallelism, encodedSalt, encodedKey), nil
}

func Verify(plain string, encodedHash string) (bool, error) {
	params, salt, expectedKey, err := decode(encodedHash)
	if err != nil {
		return false, err
	}

	actualKey := argon2.IDKey([]byte(plain), salt, params.iterations, params.memory, params.parallelism, uint32(len(expectedKey)))
	return subtle.ConstantTimeCompare(actualKey, expectedKey) == 1, nil
}

type parameters struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
}

func decode(encodedHash string) (parameters, []byte, []byte, error) {
	fields := strings.Split(encodedHash, "$")
	if len(fields) != 6 || fields[1] != "argon2id" || fields[2] != "v=19" {
		return parameters{}, nil, nil, ErrInvalidHash
	}

	paramFields := strings.Split(fields[3], ",")
	if len(paramFields) != 3 {
		return parameters{}, nil, nil, ErrInvalidHash
	}

	parsed := parameters{}
	for _, field := range paramFields {
		keyValue := strings.SplitN(field, "=", 2)
		if len(keyValue) != 2 {
			return parameters{}, nil, nil, ErrInvalidHash
		}

		switch keyValue[0] {
		case "m":
			value, err := strconv.ParseUint(keyValue[1], 10, 32)
			if err != nil {
				return parameters{}, nil, nil, ErrInvalidHash
			}
			parsed.memory = uint32(value)
		case "t":
			value, err := strconv.ParseUint(keyValue[1], 10, 32)
			if err != nil {
				return parameters{}, nil, nil, ErrInvalidHash
			}
			parsed.iterations = uint32(value)
		case "p":
			value, err := strconv.ParseUint(keyValue[1], 10, 8)
			if err != nil {
				return parameters{}, nil, nil, ErrInvalidHash
			}
			parsed.parallelism = uint8(value)
		default:
			return parameters{}, nil, nil, ErrInvalidHash
		}
	}

	salt, err := base64.RawStdEncoding.DecodeString(fields[4])
	if err != nil {
		return parameters{}, nil, nil, ErrInvalidHash
	}

	key, err := base64.RawStdEncoding.DecodeString(fields[5])
	if err != nil {
		return parameters{}, nil, nil, ErrInvalidHash
	}

	return parsed, salt, key, nil
}
