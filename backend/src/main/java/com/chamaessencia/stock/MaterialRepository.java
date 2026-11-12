package com.chamaessencia.stock;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface MaterialRepository extends MongoRepository<Material, String> {

    boolean existsByNameKey(String nameKey);
}
